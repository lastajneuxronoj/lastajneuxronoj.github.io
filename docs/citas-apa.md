# Citas APA en el margen

El generador admite notas bibliográficas junto a los párrafos, sin copiar las referencias a JSON. El Markdown del artículo sigue siendo la única fuente de contenido.

## 1. Marcar una cita en el texto

Enlaza el texto APA con una clave estable usando el destino especial `#cite:`:

```markdown
La capacidad estadística aparece tempranamente
[Xu & Garcia, 2008](#cite:xu-garcia-2008).
```

La cita visible se conserva en el párrafo y enlaza con su entrada bibliográfica.

## 2. Marcar la entrada de bibliografía

En la sección de bibliografía, antepón la misma clave a la entrada, en forma de lista:

```markdown
- [bib:xu-garcia-2008] Xu, F., & Garcia, V. (2008). *Intuitive statistics by 8-month-old infants*. Proceedings of the National Academy of Sciences, 105(13), 5012–5015. https://doi.org/10.1073/pnas.0704450105
```

La marca `[bib:clave]` se oculta al generar la página. El texto bibliográfico se utiliza tanto en la lista final como en la tarjeta lateral; no se duplica en metadatos.

## Comportamiento

- En escritorio, la tarjeta aparece al lado del párrafo que contiene la cita.
- En pantallas estrechas, aparece debajo del párrafo.
- Varias citas en un mismo párrafo generan varias tarjetas.
- Una misma referencia puede citarse en distintos párrafos.
- Los artículos sin marcas siguen renderizándose como antes.
- Si una clave no tiene entrada o está duplicada, el generador muestra una advertencia.

Las claves deben ser únicas dentro del artículo y usar letras minúsculas, números y guiones.
