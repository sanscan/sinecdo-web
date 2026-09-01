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

El wordmark visible del header/footer conserva Inter 760 y no cambia con el sistema editorial DM Sans.

## Sistema editorial web
- tipografía principal: DM Sans;
- display/títulos principales: variable aprox. `780`;
- H3: `700`;
- párrafos: Light `300`;
- UI pequeña: `400`;
- JetBrains Mono: labels, tags, numeraciones y señales técnicas.

## Aqua
Aqua canónico restaurado: `#63E6D2` (`rgb(99,230,210)`).

El aqua más brillante `#00F3F8` queda descartado por exceso de luminosidad en pantalla.

Aplicar `#63E6D2` a señales de interfaz, símbolo/isologo, favicon y componente aqua de los lockups.

## Copy editorial
Color canónico del texto corrido sobre fondos oscuros: `#C4C7C2`.

Bold, italic y bold+italic mantienen **exactamente el mismo color del párrafo**. El énfasis se produce únicamente por peso y estilo, no por cambio de color.

## Arquitectura
- header/footer web: S SVG + texto vivo `sinecdo` en Inter 760;
- master/fallback: SVG a curvas;
- favicon: S aqua `#63E6D2`, transparente;
- símbolo/isologo: `sinecdo-symbol-master-aqua.svg`;
- editorial: DM Sans;
- técnica: JetBrains Mono.

## Regla
No cambiar el wordmark a DM Sans, no alterar la geometría del símbolo y no volver al aqua `#00F3F8` salvo nueva aprobación explícita.
