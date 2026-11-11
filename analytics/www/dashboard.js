
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