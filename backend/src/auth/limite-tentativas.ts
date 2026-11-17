import { HttpException, HttpStatus } from '@nestjs/common';

/** Limite de tentativas: no máximo `max` registros por chave dentro de `janelaMs`.
 *  ponytail: contadores em memória, por instância do servidor. Em serverless cada instância conta sozinha, então o
 *  limite é "no mínimo" esse; para um limite global, guardar os contadores no banco ou em Redis. */
export class LimiteTentativas {
  private readonly registros = new Map<string, { n: number; ate: number }>();

  constructor(
    private readonly max: number,
    private readonly janelaMs: number,
    private readonly agora: () => number = Date.now,
  ) {}

  /** Lança 429 se a chave já atingiu o limite. */
  verificar(chave: string) {
    const r = this.viva(chave);
    if (r && r.n >= this.max) {
      const minutos = Math.max(1, Math.ceil((r.ate - this.agora()) / 60_000));
      throw new HttpException(
        { statusCode: HttpStatus.TOO_MANY_REQUESTS, message: `Muitas tentativas. Tente de novo em ${minutos} minuto(s).` },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  registrar(chave: string) {
    if (this.registros.size > 5_000) this.limparVencidos(); // evita crescer sem limite sob ataque
    const r = this.viva(chave);
    this.registros.set(chave, { n: (r?.n ?? 0) + 1, ate: r?.ate ?? this.agora() + this.janelaMs });
  }

  limpar(chave: string) {
    this.registros.delete(chave);
  }

  private viva(chave: string) {
    const r = this.registros.get(chave);
    if (r && r.ate <= this.agora()) {
      this.registros.delete(chave);
      return undefined;
    }
    return r;
  }

  private limparVencidos() {
    for (const chave of [...this.registros.keys()]) this.viva(chave);
  }
}
