# Sinecdo — identidad y tipografía web

Fecha: 2026-09-01

## Wordmark / logo
- texto: `sinecdo`
- familia: **Inter variable**
- peso: `760`
- tracking: `0em`
- line-height: `.98`
- Stone: `#F2F0E9`
- Graphite: `#121514`

El wordmark queda deliberadamente separado del sistema editorial web: **el logo permanece en Inter 760**.

## Sistema editorial web
- familia base: **DM Sans**;
- titulares principales: DM Sans variable `780` aprox.;
- párrafos/editorial: DM Sans Light `300`;
- UI y textos pequeños: DM Sans Regular `400`;
- énfasis: Bold `700`, Italic Light y Bold Italic;
- contrapunto editorial: DM Sans Light Italic;
- escala de tamaños: conserva la relación de la V0 con ajustes ópticos de tracking/leading.

Archivo de implementación: `typography.css`.

## Capa técnica
**JetBrains Mono** se conserva para eyebrows, labels, numeraciones, tags, metadata y señales técnicas.

## Emojis
Los emojis se usan como marcadores semánticos selectivos en títulos y componentes, no como decoración sistemática.

## Aqua
Aqua canónico: `#00F3F8` (`rgb(0,243,248)`).

No usar el aqua anterior `#63E6D2`.

## Arquitectura
- header/footer web: S SVG + texto vivo `sinecdo` en Inter 760;
- sistema editorial: DM Sans;
- master/fallback: SVG a curvas;
- favicon: S aqua sola, transparente;
- símbolo/isologo: `sinecdo-symbol-master-aqua.svg`.

## Regla
No cambiar el wordmark a DM Sans. DM Sans es la tipografía editorial de la web; Inter queda reservada al logo. No alterar la geometría del símbolo.
