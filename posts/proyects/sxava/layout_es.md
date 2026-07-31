<link rel="stylesheet" href="/css/vidklavaro.css"/>

:::note <span class="img-inline"><img src="/svg/flag_eo.svg"></span> Contenido esperantista
La siguiente página sobre la distribución de teclado starlingshaviana que creé, trata sobre un alfabeto que actualmente es parte de la cultura esperantista, por lo que los documentos de ayuda están sólo disponibles en ese idioma. De hecho, la página original sobre este teclado fue escrita directamente en esperanto (y la puedes leer [aquí](/projects/sxava/layout-eo.html)).
:::

## Introducción
<div class="text-image"><div class="text-image-content">
<p>Aquí está la historia (muy resumida) de este sistema de escritura:</p>

<p>El alfabeto shaviano fue diseñado por <strong>Ronald Kingsley Read</strong> para escribir fonéticamente el inglés, con el objetivo de cumplir los deseos de <strong>George Shaw</strong>, premio Nobel, con repecto a la ortografía de este idioma. Varios años después, fue adoptado por Ĝan Ŭesli Starling al Esperanto debido a que el alfabeto tiene la misma premisa esperantista con repecto a "un grafema y un fonema". La historia completa del alfabeto shaviano, starlingshaviano y otras versiones de alfabetos shavianos está aquí.</p>
</div>

![G. Shaw](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/george_bernard_shaw.jpg){#fig:Shaw title = "G. Shaw"}
</div>

### ¿Cómo lo conocí?

Hace un tiempo empecé a ver letras extrañas en los tweets de un amable twitero. Le pregunté qué tipo de letras eran esas y respondió que *"es el alfabeto shaviano"*. Me interesé en ello y comencé a aprenderlo y me di cuenta de algo que ya se había dado cuenta esa persona; la escritura mediante un idioma extranjero (en este caso esperanto) es más terapéutico que usar el materno, y este efecto puede ser más grande se uno usa un sistema de escritura ajeno.

### El alfabeto

![Starlingŝava alfabeto](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/sxava_alfabeto.png?w=1024){#fig:starlingsxava title = "Aquí está el alfabeto starlingshaviano"}

- No usa mayúsculas. Sólo usa el punto medio (<span class="klav">·</span>) para denotar nombres o sustantivos propios.
- Hay patrones que los caracteres siguen y también un sistema de parejas fonéticas.
- Cada letra del alfabeto starlingshaviano tiene un equivalente latino-esperantista (y viceversa).

El documento de ayuda incluye una sección que enseña la lógica del alfabeto, la sección es prácticamente igual a esta entrada de blog.

## Para computadores y *smartphones*
El teclado corre mediante Keyman en <span class="klav windows"><img src="/svg/Windows_11_logo.svg" height="10px" weight="auto">Windows</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> macOS</span>, <span class="klav linux"><img src="/images/linux_logo.png" height="10px" weight="auto"> Linux</span>, <span class="klav android"><img src="/svg/Android_logo.svg" height="10px" weight="auto"> Android</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iOS</span> kaj <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iPadOS</span>. Uno sólo debe instalar Keyman y después instalar el teclado mediante esa aplicación.

Aquí están las diferencias entre las dos versiones de esta distribución de teclado.

| Versión de computador                                     | Versión de celular             |
|-----------------------------------------------------------|--------------------------------|
|   Alfabeto starlingshaviano                               |   Alfabeto starlingshaviano    |
|   Alfabeto latino-esperantista y diacríticos              |   Alfabeto latino-esperantista |
|   Alfabeto griego (tecla muerta)                          |   Alfabeto griego              |
|   Capas de letras y símbolos adaptables y configurables   |                                |

{#tbl:diferencoj title="Diferencias entre ambas versiones"}


### Versión de computador

En computador, las teclas blancas **se adaptan por sí mismas a tu teclado físico** (según la nomenclatura de Keyman, es un “teclado mnemotécnico” (“[*Mnemonical Layout*](https://help.keyman.com/developer/language/reference/mnemoniclayout))”, EN), así que tus capas de símbolos serán las mismas de siempre y la distribución de las teclas de letras seguirán tu distribución normal (por ejemplo: QWERTY o AZERTY se convierten en ŜĜERTŬ-𐑖𐑡𐑧𐑮𐑑𐑘 y AZERTŬ-𐑨𐑟𐑧𐑮𐑑𐑘, respectivamente). Gracias a esto, no debes aprender distribuciones de teclado extranjeras. El documento de ayuda incluye este ejemplo visual de cómo el teclado virtual se adapta a tu teclado físico.

<div class="div_interaga" style="padding-bottom: 0.7em; margin: 3px auto; max-width:1300px;">
  <p style="text-align: center;"><b>Ejemplo visual del teclado:</b>
	<select id="elektita_vidklavarfasono" name="elektita_vidklavarfasono"> 
		<option value="literoj"	>Mostrar sólo letras (QWERTY) [ANSI]</option>
		<option value="en_US"	>🇺🇸 Distribución estadounidense (QWERTY) [ANSI]</option>
		<!--<option value="DVORAK"	>🇺🇸 Usona klavaranĝo (DVORAK) [ANSI]</option>-->
		<option value="es_ES"	>🇪🇸 Distribución española (QWERTY-Ñ) [ISO]</option>
		<option value="es_LA"	>🇲🇽 Distribución español latinoamericano (QWERTY-Ñ) [ISO]</option>
		<option value="fr_FR"	>🇫🇷 Distribución francesa (AZERTY) [ISO]</option>
		<option value="de_DE"	>🇩🇪 Distribución alemana (QWERTZ) [ISO]</option>
	</select>
</p>
  <div id="svg-container"></div>
    <div>
    	<ul class="horizontala_depen" style="margin-top: 0.7em;">
    		<div>
    			<ul class="horizontala" style="justify-content: center" id="butono_grupo">
    				<li><button class="butono_verda butono_elektita" id="butono_22" style="vertical-align:middle" onclick="montri_22();"><span>Mostrar cuadrícula simple <!--&#739;--></span></button></li>
    				<li><button class="butono_verda " id="butono_33" style="vertical-align:middle" onclick="montri_33(); "><span>Mostrar cuadrícula detallada <!--&#739;--></span></button></li>
    			</ul>
    			<ul class="horizontala" style="justify-content: center">
    				<li><button class="butono_verda " id="butono_22_sxa" style="vertical-align:middle" onclick="montri_22_sxa() "><span class="ico11" id="span_ico11">Mostrar letras starlingshavianas </span></button></li>
    				<li><button class="butono_verda " id="butono_22_lat" style="vertical-align:middle" onclick="montri_22_lat() "><span class="ico22" id="span_ico22">Mostrar letras latinas </span></button></li>
    			</ul>
    		</div>
    		<div>
    			<form id="vidklavaro_form" name="vidklavaro_form">
    				<p style="text-align:center"><i>Elije los caracteres que quieres ver en el ejemplo visual de arriba:</i></p><br>
    				<p id="opcio_33" style="display:none">
    					<input id="checkbox_montrigrek_33_aliaj" name="checkbox_montrigrek_33_aliaj" type="checkbox" checked  disabled="disabled"><label for="checkbox_montrigrek_33_aliaj">Mostrar letras con <span class="klav RALT">⇮ ALTGr</span></label><br>
    					<input id="checkbox_montrigrek_33" name="checkbox_montrigrek_33" type="checkbox" checked onclick="montri_grek33()"><label   for="checkbox_montrigrek_33">Mostrar letras griegas</label>
    				</p>
    				<p id="opcio_11_sxa" style="display:">
    					<input id="checkbox_montrigrek_22_lat_alia" name="checkbox_montrigrek_22_lat_alia" type="checkbox" checked  disabled="disabled"><label for="checkbox_montrigrek_22_lat_alia">Mostrar letras con <span class="klav RALT">⇮ ALTGr</span></label><br>
  				</p>
  				<p id="opcio_22_lat" style="display:none">
  					<input id="radio_montrigrek_22_lat_alia" name="radio_montrigrek_22_lat" type="radio" value="alia" checked onclick="montri_grek22()"><label for="radio_montrigrek_22_lat_alia">Mostrar letras con <span class="klav RALT">⇮ ALTGr</span></label><br>
  					<input id="radio_montrigrek_22_lat_gr" name="radio_montrigrek_22_lat" type="radio" value="greka" onclick="montri_grek22()"><label for="radio_montrigrek_22_lat_gr">Mostrar letras griegas</label>
  				</p>
  			</form>
  		</div>
  	</ul>
  </div>
</div>

Si normalmente usas otra distribución de teclado, distinta a la de tu teclado físico, en Windows puedes pedirle a Keyman que use esa (sólo para distribuciones latinas). Para eso debes ir a los ajustes de Keyman y escojer “Opciones” (“*Options*”, EN), después la opción “Teclado de base…” (“*Base Keyboard*…”, EN) y finalmente escoger alguna distribución de telcado que use el alfabeto latino. Eso corregirá la distribución, tanto letras como símbolos.

![Lógica](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/image-1.png?w=486){#fig:lógica title = "La lógica que siguen las capas de letras en la versión de computador."}

La lógica que sigue el teclado se muestra arriba. La capa base de letras es el alfabeto starlingshaviano. Si uno activa las mayúsculas mediante la teclado modificadora <span class="klav">⇪ CAPS-Lock</span> uno puede tipear letras latinas en minúsculas, y mediante <span class="klav shift">⇧ SHIFT</span> uno puede tipear mayúsculas; esa lógica funciona tanto para el alfabeto latino como el griego (este último mediante una tecla muerta). Además, la tecla <span class="klav RALT">⇮ ALTGr</span> perrmite el tipeo de otras letras (como las propuestas de Pokrovskij, algunas letras con acento circunflejo y otras letras latinas) o dicríticos mediante teclas muertas.

<div class="table-wrapper">
<table><thead>
  <tr>
    <th>Tecla modificadora</th>
    <th>Alfabeto shaviano<br>(<span class="klav">⇪ CAPS-Lock</span>apagada)</th>
    <th>Alfabeto latino:<br>(<span class="klav">⇪ CAPS-Lock</span>encendida)</th>
    <th>Alfabeto griego:<br>(<span class="klav"><span class="RALT">⇮ ALTGr</span> + <span class="shift">⇧ SHIFT</span> + G</span>)</th>
  </tr></thead>
<tbody>
  <tr>
    <td>—</td>
    <td>Letras shavianas</td>
    <td>←</td>
    <td>←</td>
  </tr>
  <tr>
    <td>Sólo <span class="klav">⇪ CAPS-Lock</span> encendido</td>
    <td>→</td>
    <td>Minúsculas latinas</td>
    <td>Minúsculas griegas</td>
  </tr>
  <tr>
    <td><span class="klav shift">⇧ SHIFT</span></td>
    <td>→</td>
    <td>Mayúsculas latinas</td>
    <td>Mayúsculas griegas</td>
  </tr>
  <tr>
    <td><span class="klav RALT">⇮ ALTGr</span></td>
    <td>Propuestas de Prokrovskij kaj letras Ĵ y Ĥ</td>
    <td>Otras minúsculas latinas</td>
    <td>—</td>
  </tr>
  <tr>
    <td><span class="klav"><span class="RALT">⇮ ALTGr</span> > <span class="shift">⇧ SHIFT</span></span></td>
    <td>—</td>
    <td>Otras mayúsculas latinas</td>
    <td>—</td>
  </tr>
</tbody>
</table>
</div>

{#tbl:tbl_logiko title="Aquí está el uso de las capas de letras de la versión de computador."}

Tendrás muchísimos diacríticos tipeables nuevos que son configurables y son útiles si escribes en varios idiomas. Para eso ve a configuración de Keyman, elije “Distribuciones de teclado” (“*Keyboard Layouts*“, EN), y en este teclado escoje la opción “Opciones de teclado...” (“*Keyboard Options*“, EN) y responde las preguntas que aparecerán en la pantalla. También puedes buscar *“Ŝavaj agordoj”* en tu sistema operativo.

El teclado también incluye dos tipografías: **Inter Alia** y **Ormin**. Debido a que estas letras no son comunes, debes usar tipografías especiales como las mencionadas anteriormente. Si las letras shavianas no se muestran bien, debes instalar fuentes compatibles desde internet; aquí hay varias tipografías compatibles en el sitio web [𐑖𐑱𐑝𐑾𐑯](https://www.shavian.info/shavian_fonts/).

### Para *smartphones*

![Versión de celular](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/image-3.png?w=711){#fig:telefono title = "Aquí está la capa de letras starlingshaviana de la versión de celular"}

La versión de celular funciona mediante Keyman en <span class="klav android"><img src="/svg/Android_logo.svg" height="10px" weight="auto"> Android</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iOS</span> y <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iPadOS</span>. Incluye varias capas de letras: la starlingshaviana, la latina (minúsculas y mayúsculas) y la griega (minúsculas y mayúsculas). Además uno puede usar las propuestas de Prokrovskij mediante pulsación larga en la capa starlingshaviana.

Además, creé un modelo lexical para la escritura del esperanto en el alfabeto starlingshaviano. Eso permite la existencia de texto predictirvo en el teclado.
## Desscargas
<div class="hero-menu">
    <a href="https://keyman.com/downloads/" class="btn">1. Descarga Keyman</a>
    <a href="https://drive.google.com/file/d/1MoI5TRSC2ka8OOEC5zSoCfKNrSRpfIWw/view?usp=drive_link" class="btn">2a. Descarga la versión de computador</a>
    <a href="https://drive.google.com/file/d/1Mk8XVe687youHA0HGPopo8wjs0O-JscU/view?usp=drive_link" class="btn">2b. Descarga la versión de celular</a>
    <a href="https://drive.google.com/file/d/1R2JR_AwfqXPyD0el9ppZ9iBfQIwRcIj2/view?usp=sharing" class="btn">3. Descarga ambos diccionarios</a>
</div>

¿Cómo instalarlo?
1. Descarga [Keyman](https://keyman.com/downloads/) e instálalo.
2. Descarga la distribución de teclado starlingshaviana.
3. Descomprime la descarga y abre el único archivo resultante mediante Keyman. Si usas celular, en los ajustes de Keyman selecciona la opción “instalar teclado o diccionario” y después “instalar mediante archivo local” y busca el archivo descomprimido.
4. Finaliza las configuraciones
    - **Si usas Keyman en computador**, por favor configura las teclas muertas configurables para que los diacríticos funcionen bien. Si los diacríticos mediante teclas muertas no funcionan después de la configuración, reinicia Keyman o tu computador.
    - **Si usas celular** (opcional), descarga e instala el diccionario (modelo lexical) de la misma forma que el teclado para tener texto predictivo.

<script>  
  fetch("/svg/vidklavaro.svg")
    .then(r => r.text())
    .then(svg => {
        document.getElementById("svg-container").innerHTML = svg;

        document
            .getElementById("region-1")
            .style.display = "none";
    });
</script>
<script src="/js/vidklavaro.js"></script>