
$(document).on('shiny:inputchanged', function(event) {
    if (event.name !== 'include_wordpress') return;

    const container = document.getElementById(
        'daily_traffic_container'
    );

    if (!container) return;

    container.classList.add('transitioning');

    setTimeout(function() {
        container.classList.remove('transitioning');
    }, 140);
});

// Ocultar pantalla de carga
$(document).on('dashboard:ready', function() {
    const loading = document.getElementById(
        'dashboard_loading'
    );

    if (!loading) return;

    loading.classList.add('hidden');
});

// Detectar la finalización de la carga inicial
let dashboardInitialLoadComplete = false;

$(document).on('shiny:idle', function() {

    if (dashboardInitialLoadComplete) return;

    dashboardInitialLoadComplete = true;

    // Dar un pequeño margen para completar el renderizado visual
    setTimeout(function() {
        $(document).trigger('dashboard:ready');
    }, 300);

});


// ==========================================
// TABLA DE IDIOMAS: AJUSTE DINÁMICO DE FILAS
// ==========================================

(function() {

    const tableSelector = '#language_coverage_table table';
    let tableExpanded = false;
    let resizeTimeout;

    function updateLanguageTableLength() {

        const tableElement = document.querySelector(tableSelector);

        // Comprobar que la tabla ya está inicializada
        if (
            !tableElement ||
            !$.fn.DataTable.isDataTable(tableElement)
        ) {
            return;
        }

        const table = $(tableElement).DataTable();

        // Al restaurar, volver siempre a 10 entradas
        if (!tableExpanded) {
            table.page.len(10).draw('page');
            return;
        }

        const wrapper = table.table().container();
        const tableNode = table.table().node();

        const wrapperTop = wrapper.getBoundingClientRect().top;

        const header = tableNode.querySelector('thead');
        const firstRow = tableNode.querySelector('tbody tr');

        const controls = wrapper.querySelector('.dataTables_length')
            ?.closest('.row');

        const headerHeight = header
            ? header.getBoundingClientRect().height
            : 0;

        const rowHeight = firstRow
            ? firstRow.getBoundingClientRect().height
            : 30;

        const controlsHeight = controls
            ? controls.getBoundingClientRect().height
            : 40;

        // Espacio disponible hasta el borde inferior de la ventana
        const availableHeight =
            window.innerHeight -
            wrapperTop -
            headerHeight -
            controlsHeight -
            35;

        const rows = Math.max(
            1,
            Math.floor(availableHeight / rowHeight)
        );

        table.page.len(rows).draw('page');
    }

    function scheduleUpdate() {
        // Esperar a que Shiny termine de actualizar la distribución
        setTimeout(function() {
            requestAnimationFrame(updateLanguageTableLength);
        }, 200);
    }

    // Detectar maximización y restauración
    $(document).on('shiny:inputchanged', function(event) {

        if (event.name !== 'language_table_toggle') return;

        tableExpanded = Number(event.value) % 2 === 1;

        scheduleUpdate();
    });

    // Recalcular al cambiar el tamaño de la ventana
    $(window).on('resize.languageCoverage', function() {

        if (!tableExpanded) return;

        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function() {
            updateLanguageTableLength();
        }, 150);

    });

})();



// ==========================================
// TABLA DE GEOGRAFÍA: AJUSTE DINÁMICO DE FILAS
// ==========================================

(function() {

    const tableSelector = '#country_table table';
    const cardSelector = '#country_table_card';

    let tableExpanded = false;
    let resizeTimeout;

    function updateCountryTableLength() {

        const tableElement = document.querySelector(tableSelector);
        const card = document.querySelector(cardSelector);

        // Comprobar que la tabla está inicializada
        if (
            !tableElement ||
            !card ||
            !$.fn.DataTable.isDataTable(tableElement)
        ) {
            return;
        }

        const table = $(tableElement).DataTable();

        // Restaurar las 10 entradas originales
        if (!tableExpanded) {
            if (table.page.len() !== 10) {
                table.page.len(10).draw('page');
            }
            return;
        }

        const wrapper = table.table().container();
        const tableNode = table.table().node();

        const wrapperTop = wrapper.getBoundingClientRect().top;

        const header = tableNode.querySelector('thead');
        const firstRow = tableNode.querySelector('tbody tr');

        const info = wrapper.querySelector('.dataTables_info');
        const pagination = wrapper.querySelector('.dataTables_paginate');

        const headerHeight = header
            ? header.getBoundingClientRect().height
            : 0;

        const rowHeight = firstRow
            ? firstRow.getBoundingClientRect().height
            : 30;

        const footerHeight = Math.max(
            info ? info.getBoundingClientRect().height : 0,
            pagination ? pagination.getBoundingClientRect().height : 0
        );

        // Espacio disponible en pantalla
        const availableHeight =
            window.innerHeight -
            wrapperTop -
            headerHeight -
            footerHeight -
            40;

        const rows = Math.max(
            1,
            Math.floor(availableHeight / rowHeight) - 2
        );

        if (table.page.len() !== rows) {
            table.page.len(rows).draw('page');
        }
    }

    function scheduleUpdate() {

        setTimeout(function() {
            requestAnimationFrame(updateCountryTableLength);
        }, 200);
    }

// Detectar maximización y restauración
$(document).on('shiny:inputchanged', function(event) {

    if (event.name !== 'country_table_toggle') return;

    tableExpanded = Number(event.value) % 2 === 1;

    const card = document.querySelector(cardSelector);
    const mapCard = document.querySelector('#country_map_card');

    if (!card || !mapCard) return;

    card.classList.toggle(
        'table-expanded',
        tableExpanded
    );

    mapCard.classList.toggle(
        'card-collapsed',
        tableExpanded
    );

    scheduleUpdate();
});

    // Recalcular si la tabla termina de renderizarse
    $(document).on('shiny:value', function(event) {

        if (event.target.id !== 'country_table') return;

        scheduleUpdate();
    });

    // Recalcular al cambiar el tamaño de la ventana
    $(window).on('resize.countryTable', function() {

        if (!tableExpanded) return;

        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function() {
            updateCountryTableLength();
        }, 150);

    });

})();
