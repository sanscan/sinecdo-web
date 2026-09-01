# Sinecdo — identidad final web

Fecha: 2026-09-01

## Wordmark
- texto: `sinecdo`
- familia: Inter variable
- peso: `760`
- tracking: `0em`
- line-height: `.98`
- Stone: `#F2F0E9`
- Graphite: `#121514`

El wordmark visible del header/footer comparte los mismos tokens tipográficos que `.section-title`.

## Aqua
Aqua canónico: `#00F3F8` (`rgb(0,243,248)`).

No usar el aqua anterior `#63E6D2`.

## Arquitectura
- header/footer web: S SVG + texto vivo `sinecdo` en Inter 760;
- master/fallback: SVG a curvas;
- favicon: S aqua sola, transparente;
- símbolo/isologo: `sinecdo-symbol-master-aqua.svg`.

## Regla
No volver a DM Sans, no aplicar tracking negativo al wordmark y no alterar la geometría del símbolo.
