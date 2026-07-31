<link rel="stylesheet" href="/css/vidklavaro.css"/>

## Enkonduko
<div class="text-image"><div class="text-image-content">
<p>Jen tre resumita historio de tiu ĉi skribsistemo:</p>

<p>La ŝava alfabeto estis dizajnita de <strong>Ronald Kingsley Read</strong> por skribi fonetike la anglan, kun la celo je plenumi la dezirojn de <strong>George Shaw</strong>, Nobel-premiito,  koncerne la ortografio de tiu lingvo. Plurajn jarojn poste, ĝi estis adaptita de Ĝan Ŭesli Starling al Esperanto ĉar la alfabeto havas la saman Esperantan premison pri unu grafemo kaj unu fonemo. La kompleta historio de la ŝava alfabeto, starlingŝava kaj aliaj ŝavidaj estas ĉi tie.</p>
</div>

![G. Shaw](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/george_bernard_shaw.jpg){#fig:Shaw title = "G. Shaw"}
</div>

### Kiel mi konis ĝin?

Antaŭ iom da tempo mi ekvidis strangajn literojn sur pepoj el afabla tviterano. Mi petis al ri, pri kiaj literoj estis tiuj, kaj respondis, ke *“ĝi estas la ŝava alfabeto”*. Mi interesiĝis pri ĝi kaj eklernis ĝin kaj mi rimarkis ion, kion ri jam estis rimarkinta; verkado per fremda lingvo (ĉi-kaze t.e Esperanto) estas pli terapia ol uzi la denaskan, kaj ĉi tiu efiko eble estas pli granda se oni uzas fremdan skribsistemon.

### La alfabeto

![Starlingŝava alfabeto](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/sxava_alfabeto.png?w=1024){#fig:starlingsxava title = "Jen la starlingŝava alfabeto"}

- Ĝi ne uzas majusklojn. Nur ĝi uzas interpunkton (<span class="klav">·</span>) por marki nomojn.
- Estas ŝablonoj, kiujn la karakteroj sekvas, kaj ankaŭ fonetika parsistemo.
- Ĉiu starlingŝava litero havas Esperantlatinan ekvivalenton, kaj inverse.

La helpdokumento inkludas sekcion, kiu instruas la logikon de la alfabeto; la sekcio estas preskaŭ egala je ĉi tiu afiŝo.

## Por komputiloj kaj saĝtelefonoj

La klavaro ruliĝas per Keyman, ĉe <span class="klav windows"><img src="/svg/Windows_11_logo.svg" height="10px" weight="auto">Vindozo</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> macOS</span>, <span class="klav linux"><img src="/images/linux_logo.png" height="10px" weight="auto"> Linukso</span>, <span class="klav android"><img src="/svg/Android_logo.svg" height="10px" weight="auto"> Android</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iOS</span> kaj <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iPadOS</span>. Oni nur devas instali na Keyman kaj poste instali la version de la klavaro, kiun vi volas, per tiu aplikaĵo.

Jen la diferencoj inter la du versioj de tiu ĉi klavarfasono:

| Komputila versio                                      | Saĝtelefona versio        |
|-------------------------------------------------------|---------------------------|
| - Starlingŝava alfabeto                               | - Starlingŝava alfabeto   |
| - Esperantlatina alfabeto kaj diakritaĵoj             | - Esperantlatina alfabeto |
| - Greka alfabeto (senpaŝklave)                        | - Greka alfabeto          |
| - Memadaptebla kaj agordeblaj liter kaj simboltavoloj |                           |

{#tbl:diferencoj title="Diferencoj inter ambaŭ versioj"}


### Komputila versio

Komputile, la blankaj klavoj **mem adaptas al via fizika klavaro** (laŭ Keymana nomenklaturo, ĝi estas “mnemonika klavaro” (“[*Mnemonical Layout*](https://help.keyman.com/developer/language/reference/mnemoniclayout))“, EN). Do, viaj simbolklavoj estos la samaj ol ĉiam kaj la klavaranĝo de litertavoloj sekvos via normala (ekzemple: QWERTY aŭ AZERTY iĝas ŜĜERTŬ-𐑖𐑡𐑧𐑮𐑑𐑘 kaj AZERTŬ-𐑨𐑟𐑧𐑮𐑑𐑘, respektive). Danke al ĉi tio, vi ne devos lerni fremdajn klavaranĝojn, sed nur uzi la kutiman. La helpdokumento de la klavaro ankaŭ inkludas ĉi tiun vidan ekzemplon je kiel la virtuala klavaro adaptas al la fizika klavaro.

<div class="div_interaga" style="padding-bottom: 0.7em; margin: 3px auto; max-width:1300px;">
  <p style="text-align: center;"><b>Ekzempla vidklavaro:</b>
	<select id="elektita_vidklavarfasono" name="elektita_vidklavarfasono"> 
		<option value="literoj"	>Montri nur literojn (QWERTY) [ANSI]</option>
		<option value="en_US"	>🇺🇸 Usona klavaranĝo (QWERTY) [ANSI]</option>
		<!--<option value="DVORAK"	>🇺🇸 Usona klavaranĝo (DVORAK) [ANSI]</option>-->
		<option value="es_ES"	>🇪🇸 Hispana klavaranĝo (QWERTY-Ñ) [ISO]</option>
		<option value="es_LA"	>🇲🇽 Latinamerikhispana klavaranĝo (QWERTY-Ñ) [ISO]</option>
		<option value="fr_FR"	>🇫🇷 Franca klavaranĝo (AZERTY) [ISO]</option>
		<option value="de_DE"	>🇩🇪 Germana klavaranĝo (QWERTZ) [ISO]</option>
	</select>
</p>
  <div id="svg-container"></div>
    <div>
    	<ul class="horizontala_depen" style="margin-top: 0.7em;">
    		<div>
    			<ul class="horizontala" style="justify-content: center" id="butono_grupo">
    				<li><button class="butono_verda butono_elektita" id="butono_22" style="vertical-align:middle" onclick="montri_22();"><span>Montri simplan  kradon <!--&#739;--></span></button></li>
    				<li><button class="butono_verda " id="butono_33" style="vertical-align:middle" onclick="montri_33(); "><span>Montri detalan kradon <!--&#739;--></span></button></li>
    			</ul>
    			<ul class="horizontala" style="justify-content: center">
    				<li><button class="butono_verda " id="butono_22_sxa" style="vertical-align:middle" onclick="montri_22_sxa() "><span class="ico11" id="span_ico11">Montri starlingŝavaĵojn </span></button></li>
    				<li><button class="butono_verda " id="butono_22_lat" style="vertical-align:middle" onclick="montri_22_lat() "><span class="ico22" id="span_ico22">Montri latinajn literojn </span></button></li>
    			</ul>
    		</div>
    		<div>
    			<form id="vidklavaro_form" name="vidklavaro_form">
    				<p style="text-align:center"><i>Elektu la skribsignojn, kiujn vi volas vidi sur la supra ekzempla vidklavaro:</i></p><br>
    				<p id="opcio_33" style="display:none">
    					<input id="checkbox_montrigrek_33_aliaj" name="checkbox_montrigrek_33_aliaj" type="checkbox" checked  disabled="disabled"><label for="checkbox_montrigrek_33_aliaj">Montri <span class="klav RALT">⇮ ALTGr</span> aliaĵojn</ label><br>
    					<input id="checkbox_montrigrek_33" name="checkbox_montrigrek_33" type="checkbox" checked onclick="montri_grek33()"><label   for="checkbox_montrigrek_33">Montri grekajn literojn</label>
    				</p>
    				<p id="opcio_11_sxa" style="display:">
    					<input id="checkbox_montrigrek_22_lat_alia" name="checkbox_montrigrek_22_lat_alia" type="checkbox" checked  disabled="disabled"><label for="checkbox_montrigrek_22_lat_alia">Montri <span class="klav RALT">⇮ ALTGr</span> aliaĵojn</  label><br>
  				</p>
  				<p id="opcio_22_lat" style="display:none">
  					<input id="radio_montrigrek_22_lat_alia" name="radio_montrigrek_22_lat" type="radio" value="alia" checked onclick="montri_grek22()"><label for="radio_montrigrek_22_lat_alia">Montri <span class="klav RALT">⇮ ALTGr</span> aliaĵojn</label><br>
  					<input id="radio_montrigrek_22_lat_gr" name="radio_montrigrek_22_lat" type="radio" value="greka" onclick="montri_grek22()"><label for="radio_montrigrek_22_lat_gr">Montri grekajn literojn</label>
  				</p>
  			</form>
  		</div>
  	</ul>
  </div>
</div>

Se vi normale uzas alian klavarfasonon, malsama ol la klavarfasono de via fizika klavarfasono, Vindoze vi povas peti al Keyman uzu tiun (nur latinaĵoj). Por tio, vi devas iri agorden de Keyman, elekti “Opcioj”-n (“*Options*“, EN), poste la opcion na “Baza Klavaro…” (“*Base Keyboard*…”, EN) kaj finfine elekti iun klavarfasonon, kiu uzas la latinan alfabeton. Tio korektos la klavaraĝon: litertavolojn kaj simboltavolojn.

![logiko](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/image-1.png?w=486){#fig:logiko title = "Jen la logiko, kiun sekvas la litertavoloj de la komputila versio"}

La logiko, kiun sekvas la klavaro estas montrata supre. La baza litertavolo estas la starlingŝava alfabeto. Se oni ŝaltas majusklojn per la modifklavo <span class="klav">⇪ CAPS-Lock</span>, oni povas tajpi minusklojn, kaj per <span class="klav shift">⇧ SHIFT</span> oni tajpas majusklojn; tiu logiko funkcias por la latina kaj greka alfabeto (ĉi-lasta per senpaŝklavo). Aldone, la klavo <span class="klav RALT">⇮ ALTGr</span> permesas la tajpon de aliaj literoj (t.e. proponaĵoj de Pokrovskij, kelkaj ĉapelitaj literoj kaj aliaj latinaĵoj) aŭ diakritaj senpaŝklavoj.

<div class="table-wrapper">
<table><thead>
  <tr>
    <th>Modifklavo</th>
    <th>Ŝava alfabeto<br>(<span class="klav">⇪ CAPS-Lock</span>malŝaltita)</th>
    <th>Latina alfabeto:<br>(<span class="klav">⇪ CAPS-Lock</span>ŝaltita)</th>
    <th>Greka alfabeto:<br>(<span class="klav"><span class="RALT">⇮ ALTGr</span><span class="plus"> + </span><span class="shift">⇧ SHIFT</span><span class="plus"> + </span>G</span>)</th>
  </tr></thead>
<tbody>
  <tr>
    <td>—</td>
    <td>Ŝavaj literoj</td>
    <td>←</td>
    <td>←</td>
  </tr>
  <tr>
    <td>Nur <span class="klav">⇪ CAPS-Lock</span> ŝaltita</td>
    <td>→</td>
    <td>Latinaj minuskloj</td>
    <td>Grekaj minuskloj</td>
  </tr>
  <tr>
    <td><span class="klav shift">⇧ SHIFT</span></td>
    <td>→</td>
    <td>Latinaj majuskloj</td>
    <td>Grekaj majuskloj</td>
  </tr>
  <tr>
    <td><span class="klav RALT">⇮ ALTGr</span></td>
    <td>Proponaĵoj de Prokrovskij kaj literoj Ĵ kaj Ĥ</td>
    <td>Aliaj latinaj minuskloj</td>
    <td>—</td>
  </tr>
  <tr>
    <td><span class="klav"><span class="RALT">⇮ ALTGr</span><span class="plus"> > </span><span class="shift">⇧ SHIFT</span></span></td>
    <td>—</td>
    <td>Aliaj latinaj majuskloj</td>
    <td>—</td>
  </tr>
</tbody>
</table>
</div>

{#tbl:tbl_logiko title="Jen la uzado de la litertavoloj de la komputila versio."}

Vi havos multajn novajn diakritaĵojn tajpeblajn, kiu estas agordeblaj kaj utilas se vi skribas per pluraj lingvoj. Por tio, iru agorden de Keyman elekti “Klavaranĝojn” (“*Keyboard Layouts*“, EN), ĉi-klavaron kaj la opcion “Klavaraj opcioj” (“*Keyboard Options*“, EN) kaj respondi la demandojn, kiuj aperos surekrane. Ankaŭ vi povas serĉi na “Ŝavaj agordoj” viaoperaciume.

La klavaro ankaŭ inkludas du tiparojn: na **Inter Alia** kaj **Ormin**. Ĉar tiuj  ĉi literoj ne estas oftaj, vi devas uzi specialajn tiparojn kiel la antaŭajn menciitajn. Se la ŝavajn literojn ne montriĝas bone, vi devos instali iun ajn kongruajn tipografiojn el Interreto; jen pluraj tipografioj kongruaj ĉe la retejo [𐑖𐑱𐑝𐑾𐑯](https://www.shavian.info/shavian_fonts/).

### Por saĝtelefonoj

![Saĝtelefona versio](https://lastajneuxronoj.wordpress.com/wp-content/uploads/2024/02/image-3.png?w=711){#fig:telefono title = "Jen la starlingŝava litertavolo de la saĝtelefona versio"}

La ŝagtelefona versio funkcias per Keyman ĉe <span class="klav android"><img src="/svg/Android_logo.svg" height="10px" weight="auto"> Android</span>, <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iOS</span> kaj <span class="klav apple"><img src="/svg/Apple_logo.svg" height="10px" weight="auto"> iPadOS</span>. Ĝi enhavas plurajn litertavolojn; starlingŝavan, latinan (minusklojn kaj majusklojn) kaj grekan (minusklojn kaj majusklojn). Ankaŭ oni povas uzi la proponaĵojn de Pokrovskij per daŭra premado sur la ŝava litertavolo.

Aldone, mi kreis leksikan modelon por la verkado de Esperanto starlingŝave. Tio permesas la ekzistado de antaŭdira teksto je la klavaro.

## Elŝutoj
<div class="hero-menu">
    <a href="https://keyman.com/downloads/" class="btn">1. Elŝuti na Keyman</a>
    <a href="https://drive.google.com/file/d/1MoI5TRSC2ka8OOEC5zSoCfKNrSRpfIWw/view?usp=drive_link" class="btn">2a. Elŝuti la komputilan</a>
    <a href="https://drive.google.com/file/d/1Mk8XVe687youHA0HGPopo8wjs0O-JscU/view?usp=drive_link" class="btn">2b. Elŝuti la saĝtelefonan</a>
    <a href="https://drive.google.com/file/d/1R2JR_AwfqXPyD0el9ppZ9iBfQIwRcIj2/view?usp=sharing" class="btn">3. Elŝuti  ambaŭ vortarojn</a>
</div>

### Kiel instali ĝin?
1. Elŝutu na [Keyman](https://keyman.com/downloads/) kaj instalu ĝin.
2. Elŝutu la starlingŝavan klavarfasonon.
3. Maldensigu la elŝutaĵon kaj malfermu la nuran rezultantan dosieron per Keyman. Se vi uzas saĝtelefonon, ĉe la Keymanaj agordoj, premu la opcion *“instalu klavaron aŭ vortaron”*, poste *“instalu per loka dosiero”* kaj serĉu la maldensiaĵon.
4. Finigu la agordojn:
    - **Se vi rulas na Keyman per komputilo**, agordu la agordeblajn senpaŝklavojn, bonvole, por ke diakritaĵoj bone funkciu. Se la diakritaj senpaŝklavoj ne funkcias post la agordo, bonvole, restartigu na Keyman aŭ la komputilon.
    - **Se vi uzas saĝtelefonon** (laŭvole), elŝutu kaj instalu la vortaron (leksikan modelon), sammaniere kiel la klavaron, por havi antaŭdiran tekston.

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