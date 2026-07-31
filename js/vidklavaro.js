
// origina lingvo de la klavaro
var en_US = document.getElementsByClassName('EN');
var es_ES = document.getElementsByClassName('ES');
var es_LA = document.getElementsByClassName('LA');
var fr_FR = document.getElementsByClassName('FR');
var de_DE = document.getElementsByClassName('DE');

// tipoj de skribsigno
var elektita_vidklavarfasono = document.getElementById('elektita_vidklavarfasono');
var simb = document.getElementsByClassName('simb');
var altgr = document.getElementsByClassName('altgr');
var num = document.getElementsByClassName('num');
var QWERTY = document.getElementsByClassName('QWERTY'); //poner todas las letras en QWERTY, excepto las que varíen enidioma.
//var DVORAK = document.getElementsByClassName('DVORAK');
var ANSI = document.getElementsByClassName('ANSI');
var ISO = document.getElementsByClassName('ISO');
// opcioj
var opcio_11_sxa = document.getElementById('opcio_11_sxa');
var opcio_22_lat = document.getElementById('opcio_22_lat');
var opcio_33 = document.getElementById('opcio_33');
var butono_22 = document.getElementById('butono_22');
var butono_33 = document.getElementById('butono_33');
var gr = document.getElementsByClassName('gr');
var aliaj = document.getElementsByClassName('aliaj');
var checkbox_montrigrek_33 = document.getElementById('checkbox_montrigrek_33');
var radio_montrigrek_22 = document.vidklavaro_form.elements.radio_montrigrek_22_lat;
var last_22 = 'sxa';
// simboloj montrataj
var neorigina = document.getElementsByClassName('neorigina');
var figuroj_group_11 = document.getElementsByClassName('figuroj_group_11');
var figuroj_group_12 = document.getElementsByClassName('figuroj_group_12');
var figuroj_group_22 = document.getElementsByClassName('figuroj_group_22');
var figuroj_group_33 = document.getElementsByClassName('figuroj_group_33');
var simboloj_11 = document.getElementsByClassName('simboloj_11');
var simboloj_22 = document.getElementsByClassName('simboloj_22');
var simboloj_33 = document.getElementsByClassName('simboloj_33');
elektita_vidklavarfasono.addEventListener("change", vidklavaro_e); // kontroli ĉu la formularo estas ŝanĝita			
function vidklavaro_e () { // [mal]-montri skribsignojn depende de la lingvo de la klavaro
	
	// [mal]-montri ANSI-ajn aŭ ISO-ajn skribsignojn
	if(elektita_vidklavarfasono.value == 'literoj' || elektita_vidklavarfasono.value == 'en_US' || elektita_vidklavarfasono.value == 'DVORAK') {
		for (var i = 0; i < ISO.length; i ++) { ISO[i].style.display = 'none'; }
		for (var i = 0; i < ANSI.length; i ++) { ANSI[i].style.display = ''; }
	} else {
		for (var i = 0; i < ISO.length; i ++) { ISO[i].style.display = ''; }
		for (var i = 0; i < ANSI.length; i ++) { ANSI[i].style.display = 'none'; }
	}
	// malmontri ĉiujn literojn
	for (var i = 0; i < neorigina.length; i ++) { neorigina[i].style.display = 'none'; } //malmontras literoj ŝanĝitaj el la origina QWERTY-o
	
	document.getElementById('Key_A_Original').style.display='';
	document.getElementById('Key_Q_Original').style.display='';
	document.getElementById('Key_Z_Original').style.display='';
	document.getElementById('Key_W_Original').style.display='';
	document.getElementById('Key_M_Original').style.display='';
	document.getElementById('Key_Y_Original').style.display='';
	
	for (var i = 0; i < en_US.length; i ++) { en_US[i].style.display = 'none'; }
	for (var i = 0; i < es_ES.length; i ++) { es_ES[i].style.display = 'none'; }
	for (var i = 0; i < es_LA.length; i ++) { es_LA[i].style.display = 'none'; }
	for (var i = 0; i < fr_FR.length; i ++) { fr_FR[i].style.display = 'none'; }
	for (var i = 0; i < de_DE.length; i ++) { de_DE[i].style.display = 'none'; }
	// malmontri simbolojn kaj numerojn se "nur literoj" elektitas.
	if(elektita_vidklavarfasono.value == 'literoj' || elektita_vidklavarfasono.value == 'fr_FR') {
		for (var i = 0; i < simb.length; i ++) { simb[i].style.display = 'none'; }
		for (var i = 0; i < altgr.length; i ++) { altgr[i].style.display = 'none'; }
		for (var i = 0; i < num.length; i ++) { num[i].style.display = 'none'; }	
	} else {
		for (var i = 0; i < num.length; i ++) { num[i].style.display = ''; }
	}
	// montri nur skribsignojn elektitajn
	if(elektita_vidklavarfasono.value == 'en_US') {
		for (var i = 0; i < en_US.length; i ++) { en_US[i].style.display = ''; }
	} else if(elektita_vidklavarfasono.value == 'es_ES') {
		for (var i = 0; i < es_ES.length; i ++) { es_ES[i].style.display = ''; }
	} else if(elektita_vidklavarfasono.value == 'fr_FR') {
		for (var i = 0; i < fr_FR.length; i ++) { fr_FR[i].style.display = ''; }
		document.getElementById('Key_A_Original').style.display='none';
		document.getElementById('Key_Q_Original').style.display='none';
		document.getElementById('Key_Z_Original').style.display='none';
		document.getElementById('Key_W_Original').style.display='none';
		document.getElementById('Key_M_Original').style.display='none';
	} else if(elektita_vidklavarfasono.value == 'de_DE') {
		for (var i = 0; i < de_DE.length; i ++) { de_DE[i].style.display = ''; }
		document.getElementById('Key_Z_Original').style.display='none';
		document.getElementById('Key_Y_Original').style.display='none';
	} else if(elektita_vidklavarfasono.value == 'es_LA') {
		for (var i = 0; i < es_LA.length; i ++) { es_LA[i].style.display = ''; }
	}
	else if(elektita_vidklavarfasono.value == 'dvorak') {
		for (var i = 0; i < dvorak.length; i ++) { dvorak[i].style.display = ''; }
	}
	
}

function montri_33() {
	if (butono_22.className.match(/(?:^|\s)butono_elektita(?!\S)/)) { //check if that class is assigned
		butono_22.className = butono_22.className.replace( /(?:^|\s)butono_elektita(?!\S)/g , '' ); //this delete that class
		butono_33.className += " butono_elektita";
		butono_22_sxa.className = 'butono_verda butono_maleblita'
		butono_22_lat.className = 'butono_verda butono_maleblita'
	}
	for (var i = 0; i < figuroj_group_11.length; i ++) { figuroj_group_11[i].style.display = 'none'; }
	for (var i = 0; i < simboloj_11.length; i ++) { simboloj_11[i].style.display = 'none'; }
	for (var i = 0; i < figuroj_group_22.length; i ++) { figuroj_group_22[i].style.display = 'none'; }
	for (var i = 0; i < simboloj_22.length; i ++) { simboloj_22[i].style.display = 'none'; }
	for (var i = 0; i < figuroj_group_33.length; i ++) { figuroj_group_33[i].style.display = ''; }
	for (var i = 0; i < simboloj_33.length; i ++) { simboloj_33[i].style.display = ''; }
	for (var i = 0; i < aliaj.length; i ++) { aliaj[i].style.display = ''; } // it always shows aliaĵojs with 3x3 activated
	opcio_11_sxa.style.display = 'none';
	opcio_22_lat.style.display = 'none';
	opcio_33.style.display = '';
	montri_grek33();
}

function montri_22() {
	if (butono_33.className.match(/(?:^|\s)butono_elektita(?!\S)/)) { //check if that class is assigned
		butono_33.className = butono_33.className.replace( /(?:^|\s)butono_elektita(?!\S)/g , '' ); //this delete that class
		butono_22.className += " butono_elektita";
		butono_22_sxa.className = butono_22_sxa.className.replace( /(?:^|\s)butono_maleblita(?!\S)/g , '' );
		butono_22_lat.className = butono_22_lat.className.replace( /(?:^|\s)butono_maleblita(?!\S)/g , '' );
		if (last_22 == 'sxa') {
			butono_22_sxa.className += " butono_elektita";
			montri_22_sxa();
		} else {
			butono_22_lat.className += " butono_elektita";
			montri_22_lat();
		}
	}
	for (var i = 0; i < figuroj_group_33.length; i ++) { figuroj_group_33[i].style.display = 'none'; }
	for (var i = 0; i < simboloj_33.length; i ++) { simboloj_33[i].style.display = 'none'; }
	
	opcio_33.style.display = 'none';
}

function montri_22_sxa() {
	if(butono_22.className.match(/(?:^|\s)butono_elektita(?!\S)/)) {
		if (butono_22_lat.className.match(/(?:^|\s)butono_elektita(?!\S)/)) { //check if that class is assigned
		butono_22_lat.className = butono_22_lat.className.replace( /(?:^|\s)butono_elektita(?!\S)/g , '' );
		butono_22_sxa.className += " butono_elektita";
		}
	for (var i = 0; i < figuroj_group_11.length; i ++) { figuroj_group_11[i].style.display = ''; }
	for (var i = 0; i < simboloj_11.length; i ++) { simboloj_11[i].style.display = ''; }
	for (var i = 0; i < figuroj_group_22.length; i ++) { figuroj_group_22[i].style.display = 'none'; }
	for (var i = 0; i < simboloj_22.length; i ++) { simboloj_22[i].style.display = 'none'; }
	for (var i = 0; i < aliaj.length; i ++) { aliaj[i].style.display = ''; } // it always shows aliaĵojs with sxa activated
	opcio_22_lat.style.display = 'none';
	opcio_11_sxa.style.display = '';
	last_22 = 'sxa';
	}
}

function montri_22_lat() {
	if(butono_22.className.match(/(?:^|\s)butono_elektita(?!\S)/)) {
		if (butono_22_sxa.className.match(/(?:^|\s)butono_elektita(?!\S)/)) { //check if that class is assigned
		butono_22_sxa.className = butono_22_lat.className.replace( /(?:^|\s)butono_elektita(?!\S)/g , '' );
		butono_22_lat.className += " butono_elektita";
	}
	for (var i = 0; i < figuroj_group_11.length; i ++) { figuroj_group_11[i].style.display = 'none'; }
	for (var i = 0; i < simboloj_11.length; i ++) { simboloj_11[i].style.display = 'none'; }
	for (var i = 0; i < figuroj_group_22.length; i ++) { figuroj_group_22[i].style.display = ''; }
	for (var i = 0; i < simboloj_22.length; i ++) { simboloj_22[i].style.display = ''; }
	opcio_11_sxa.style.display = 'none';
	opcio_22_lat.style.display = '';
	last_22 = 'lat';
	montri_grek22();
	}
}

function montri_grek33() {
	if(butono_33.className.match(/(?:^|\s)butono_elektita(?!\S)/) && checkbox_montrigrek_33.checked == true) {
		for (var i = 0; i < gr.length; i ++) { gr[i].style.display = ''; }
	} else if((butono_33.className.match(/(?:^|\s)butono_elektita(?!\S)/) && checkbox_montrigrek_33.checked == false)) {
		for (var i = 0; i < gr.length; i ++) { gr[i].style.display = 'none'; }
	}
}

function montri_grek22() {
	if(butono_22.className.match(/(?:^|\s)butono_elektita(?!\S)/) && radio_montrigrek_22.value == 'greka') {
		for (var i = 0; i < gr.length; i ++) { gr[i].style.display = ''; }
		for (var i = 0; i < aliaj.length; i ++) { aliaj[i].style.display = 'none'; }
	} else if (butono_22.className.match(/(?:^|\s)butono_elektita(?!\S)/) && radio_montrigrek_22.value == 'alia') {
		for (var i = 0; i < gr.length; i ++) { gr[i].style.display = 'none'; }
		for (var i = 0; i < aliaj.length; i ++) { aliaj[i].style.display = ''; }
	}
}

