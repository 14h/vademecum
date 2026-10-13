$(document).ready(function() {

    function getQueryParam(param) {
        const params = new URLSearchParams(window.location.search);
        return params.get(param);
    }

    const hash = window.location.hash;
    const linkType = getQueryParam("t");
    if (hash) {
        const id = hash.substring(1);
        // Suchen nach dem <span>-Element mit der ID und Klasse 'jumpmark' hinzufügen
        const $targetElement = $("#" + id);
        if ($targetElement.length && parseInt(linkType) >= 3 && !$targetElement.hasClass('fallvignette-body')) {
            $targetElement.addClass("jumpmark");
        }

        const accordionElement = $('#' + id);
        if(!accordionElement.length){
            return;
        }
        accordionElement.collapse('show');

        const parentAccordionElement = accordionElement.parents('.collapse');
        if (parentAccordionElement.length > 0) {
            parentAccordionElement.collapse('show');
        }
        let stickyOffset = 0;
        const accordionElementTop = accordionElement.offset().top;

        $('.sticky').each(function() {
            const stickyElement = $(this);
            const stickyElementTop = stickyElement.offset().top;
            const stickyElementHeight = stickyElement.outerHeight();

            if (stickyElementTop < accordionElementTop) {
                stickyOffset += stickyElementHeight;
            }
        });

        $('html, body').animate({ scrollTop: accordionElement.offset().top - stickyOffset }, 800);
    }
    $('body').on('change', 'select[data-select-edition]', function(){
        const edition = $(this).val();
        window.location.href = '/med/' + edition + '/search';
    }).on('keyup', '[data-search-input]', function(){
        const search = $(this).val();
        const area = $(this).data('area');
        if(!search){
            $('[data-result-list].'+area).html('');
            $('span.hint, div.hint').show();
            return;
        }
        $('span.hint, div.hint').hide();
        $('[data-result-list].'+area).html('<img src="/med/ximg/select2-spinner.gif" alt="spinner" style="margin:0 auto; display:inline-block"/>');
        const url = $(this).data('url');
        $.ajax({
            url: url,
            method: 'POST',
            data: {
                search: search,
                area: area
            },
            success: function(response){
                $('[data-result-list].'+area).html(response);
            }
        });
    }).on('click', '[data-doi-click]', function(e){
       e.preventDefault();
        const textToCopy = $('[data-column="doi-copy-text"]').text();

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(function() {
                alert('Titel mit DOI in Zwischenablage kopiert.');
            }).catch(function(err) {
                alert('Fehler beim Kopieren in die Zwischenablage');
            });
        }
    }).on('click', '[data-feedback-area-doi]', function(e){
       e.preventDefault();
       const doiId = $(this).data('id');
       const textToCopy = $('[data-column="doi-copy-text"][data-id="'+doiId+'"]').text();
        console.log(doiId);
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(function() {
                alert('Titel mit DOI in Zwischenablage kopiert.');
            }).catch(function(err) {
                alert('Fehler beim Kopieren in die Zwischenablage');
            });
        }
    });


});
