
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
    let resizeTimeout;

    function updateLanguageTableLength() {

        const tableElement = document.querySelector(tableSelector);

        if (
            !tableElement ||
            !$.fn.DataTable.isDataTable(tableElement)
        ) {
            return;
        }

        const table = $(tableElement).DataTable();
        const wrapper = table.table().container();
        const tableNode = table.table().node();

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

        const wrapperTop = wrapper.getBoundingClientRect().top;

        const availableHeight =
            window.innerHeight -
            wrapperTop -
            headerHeight -
            controlsHeight -
            40;

        // Evitar cálculos mientras la tabla no tenga dimensiones válidas
        if (
            !wrapper.getClientRects().length ||
            !Number.isFinite(availableHeight) ||
            !Number.isFinite(rowHeight) ||
            rowHeight <= 0
        ) {
            return;
        }

        const calculatedRows = Math.floor(availableHeight / rowHeight) - 1;

        const rows = Number.isFinite(calculatedRows)
            ? Math.max(1, calculatedRows)
            : 1;

        if (table.page.len() !== rows) {
            table.page.len(rows).draw('page');
        }
    }

    function scheduleUpdate() {

        setTimeout(function() {
            requestAnimationFrame(updateLanguageTableLength);
        }, 200);
    }

    // Recalcular cuando se maximiza o restaura
    $(document).on('shiny:inputchanged', function(event) {

        if (event.name !== 'language_table_toggle') return;

        scheduleUpdate();
    });

    // Recalcular cuando termina de renderizarse la tabla
    $(document).on('shiny:value', function(event) {

        if (event.target.id !== 'language_coverage_table') return;

        scheduleUpdate();
    });

    // Recalcular al cambiar el tamaño de la ventana
    $(window).on('resize.languageCoverage', function() {

        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function() {
            updateLanguageTableLength();
        }, 150);

    });

    // Cálculo inicial
    $(document).on('shiny:idle', scheduleUpdate);

})();




// ==========================================
// TABLA DE GEOGRAFÍA: AJUSTE DINÁMICO
// ==========================================

(function() {

    const tableSelector = '#country_table table';
    const cardSelector = '#country_table_card';
    const columnSelector = '.country-left-column';

    let tableExpanded = false;
    let resizeTimeout;

    // Ajustar la altura de la columna al espacio disponible
    function updateCountryColumnHeight() {

        const column = document.querySelector(columnSelector);

        if (!column) return;

        const columnTop = column.getBoundingClientRect().top;
        const availableHeight = window.innerHeight - columnTop - 40;

        if (
            !Number.isFinite(availableHeight) ||
            availableHeight <= 0
        ) {
            return;
        }

        column.style.height = `${availableHeight}px`;
    }

    // Ajustar el número de filas de la tabla
    function updateCountryTableLength() {

        const tableElement = document.querySelector(tableSelector);
        const card = document.querySelector(cardSelector);

        if (
            !tableElement ||
            !card ||
            !$.fn.DataTable.isDataTable(tableElement)
        ) {
            return;
        }

        const table = $(tableElement).DataTable();
        const wrapper = table.table().container();
        const tableNode = table.table().node();

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

        const wrapperTop = wrapper.getBoundingClientRect().top;

        const availableHeight =
            window.innerHeight -
            wrapperTop -
            headerHeight -
            controlsHeight -
            40;

        if (
            !wrapper.getClientRects().length ||
            !Number.isFinite(availableHeight) ||
            !Number.isFinite(rowHeight) ||
            rowHeight <= 0
        ) {
            return;
        }

        const calculatedRows = Math.floor(availableHeight / rowHeight) - 2;

        const rows = Number.isFinite(calculatedRows)
            ? Math.max(1, calculatedRows)
            : 1;

        if (table.page.len() !== rows) {
            table.page.len(rows).draw('page');
        }
    }

    // Actualizar primero la altura y después las filas
    function scheduleUpdate() {

        setTimeout(function() {

            requestAnimationFrame(function() {

                updateCountryColumnHeight();

                requestAnimationFrame(function() {
                    updateCountryTableLength();
                });

            });

        }, 200);
    }

    // Detectar maximización y restauración
    $(document).on('shiny:inputchanged', function(event) {

        if (event.name !== 'country_table_toggle') return;

        tableExpanded = Number(event.value) % 2 === 1;

        const card = document.querySelector(cardSelector);
        const mapCard = document.querySelector('#country_map_card');

        if (!card || !mapCard) return;

        card.classList.toggle('table-expanded', tableExpanded);
        mapCard.classList.toggle('card-collapsed', tableExpanded);

        scheduleUpdate();
    });

    // Recalcular cuando termina de renderizarse la tabla
    $(document).on('shiny:value', function(event) {

        if (event.target.id !== 'country_table') return;

        scheduleUpdate();
    });

    // Recalcular al cambiar el tamaño de la ventana
    $(window).on('resize.countryTable', function() {

        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function() {
            scheduleUpdate();
        }, 150);

    });

    // Cálculo inicial
    $(document).on('shiny:idle', scheduleUpdate);

})();


// ==========================================
// EDITORIAL: ORIENTACIÓN DEL GRÁFICO POR ANCHO
// ==========================================

(function() {

    const chartId = 'editorial_language_distribution';
    const inputId = 'editorial_distribution_orientation';

    let resizeObserver = null;
    let lastOrientation = null;

    function updateOrientation() {

        const chart = document.getElementById(chartId);

        if (!chart) return;

        const width = chart.getBoundingClientRect().width;

        // Ignorar elementos que todavía no son visibles
        if (width === 0) return;

        const orientation = window.matchMedia('(orientation: portrait)').matches
        ? 'horizontal'
        : 'vertical';

        // Evitar enviar el mismo valor repetidamente
        if (orientation === lastOrientation) return;

        lastOrientation = orientation;

        Shiny.setInputValue(
            inputId,
            orientation,
            { priority: 'event' }
        );
    }

    function observeChart() {

        const chart = document.getElementById(chartId);

        if (!chart) return;

        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        resizeObserver = new ResizeObserver(updateOrientation);
        resizeObserver.observe(chart);

        updateOrientation();
    }

    // Observar cuando la pestaña Editorial se muestra
    $(document).on('shown.bs.tab', function() {
        observeChart();
    });

    // Observar al terminar de renderizar el gráfico
    $(document).on('shiny:value', function(event) {

        if (event.target.id !== chartId) return;

        observeChart();
    });

    // Primera comprobación
    $(document).on('shiny:idle', function() {
        observeChart();
    });

})();


// ==========================================
// EDITORIAL: AJUSTE DINÁMICO DE ALTURA
// ==========================================

(function() {

    const gridSelector = '.editorial-charts-grid';
    const indicatorsSelector = '.editorial-value-box';

    let resizeObserver = null;
    let resizeFrame = null;

    function updateHeight() {

        const grid = document.querySelector(gridSelector);

        if (!grid) return;

        const pane = grid.closest('.tab-pane');

        if (pane && !pane.classList.contains('active')) {
            return;
        }

        const top = grid.getBoundingClientRect().top;

        const availableHeight = Math.floor(
            window.innerHeight - top - 40
        );

        if (availableHeight <= 0) return;

        grid.style.height = availableHeight + 'px';

        // Redimensionar los gráficos después de ajustar las tarjetas
        requestAnimationFrame(function() {

            if (!window.Plotly) return;

            grid.querySelectorAll('.plotly.html-widget').forEach(function(chart) {
                Plotly.Plots.resize(chart);
            });

        });
    }

    function scheduleUpdate() {

        if (resizeFrame !== null) {
            cancelAnimationFrame(resizeFrame);
        }

        resizeFrame = requestAnimationFrame(function() {
            resizeFrame = null;
            updateHeight();
        });
    }

    function observeLayout() {

        const grid = document.querySelector(gridSelector);

        if (!grid) return;

        if (resizeObserver) {
            resizeObserver.disconnect();
        }

        resizeObserver = new ResizeObserver(scheduleUpdate);

        resizeObserver.observe(grid);

        document.querySelectorAll(indicatorsSelector).forEach(function(box) {
            resizeObserver.observe(box);
        });

        scheduleUpdate();
    }

    $(window).on(
        'resize.editorialHeight orientationchange.editorialHeight',
        scheduleUpdate
    );

    $(document).on('shown.bs.tab', function() {
        observeLayout();
    });

    $(document).on('shiny:idle', observeLayout);

    $(document).on('shiny:value', function(event) {

        if (
            event.target.id &&
            event.target.id.startsWith('editorial_')
        ) {
            scheduleUpdate();
        }

    });

    observeLayout();

})();



