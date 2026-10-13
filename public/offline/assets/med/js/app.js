'use strict';
$(document).ready(function () {
  const body = $(document.body)
  const mybutton = $('#btn-back-to-top')

  const scrollUp = 'scroll-up'
  const scrollDown = 'scroll-down'
  const fixed = 'fixed'
  let lastScroll = 0

  $(window).scroll(() => {
    const currentScroll = $(window).scrollTop()
    if (currentScroll <= 90) {
      body.removeClass(scrollUp)
      mybutton.css('display', 'none')
      return
    }
    if (currentScroll > lastScroll && !body.hasClass(scrollDown)) {
      body.removeClass(scrollUp)
      body.addClass(scrollDown)
      mybutton.css('display', 'block')
    } else if (currentScroll < lastScroll && body.hasClass(scrollDown)) {
      body.removeClass(scrollDown)
      body.addClass(scrollUp)
    }

    lastScroll = currentScroll
  })

  function backToTop() {
    document.body.scrollTop = 0
    document.documentElement.scrollTop = 0
  }
  mybutton.click(() => {
    backToTop()
  })

  $('.btn-back').click(function (e) {
    e.preventDefault();
    history.back();
  });

  //prepend Arrows to each element
  let arrowLinks = $('.arrow-link');
  const arrowCode = '<i class="bi bi-arrow-right-short"></i>';
  if(arrowLinks){
    arrowLinks.each(function(){
      $(this).prepend(arrowCode);
    });
  }

  $('select').on('change', function(e){
    if($(this)[0].selectedIndex == 0){
      $(this).removeClass('selected');
    }
    else{
      $(this).addClass('selected');
    }
  });

  //initial check select status
  let select = $('select');
  select.each(function(){
    if($(this)[0].selectedIndex !== 0){
      $(this).addClass('selected');
    }
    else{
      $(this).removeClass('selected');
    }
  });

  let input = $('input');
  input.each(function(){
    let inputField = $(this).val();
    if(inputField.length > 0 ){
      $(this).addClass('active');
    }
  });

  /* FALLVIGNETE Arzneimittel TO Orange block*/
  let fvgA = $('.accordion-button .orange .black');
  fvgA.each(function(){
    let fvgString = $(this).html();
    let fvgTitle = fvgString.split(':', 1)[0]; 
    fvgString = $(this).html(fvgString.replace(fvgTitle+':', ''));
    $(this).parent().prepend(fvgTitle+':');
  });

  function hashVal(aTag){
    const hashValue = aTag.split('#')[1];
    if(hashValue){
      return hashValue;
    }
    return false;
  }

  function renderFullview(item){
    const itemID = $('#'+item);
    itemID.closest('.body-collapsible').toggleClass( 'fullview' );
    itemID.parent().next().children().toggleClass('open');
    //itemID.css('scroll-padding-top', '110px');
  }

  const langTxte = $('.langtext-detail');
  
  if(langTxte.length > 0){
    let anchorTag = window.location.href;
    let asString = anchorTag.substring(1);
    //$('html').css('scroll-padding-top', '88px');
    
    /* SUBHEADLINE TO THE RIGHT POSITION */
    const subHeadline = $('.sub-headline');
    if (subHeadline) {
      subHeadline.remove();
      $('.section-title').after(subHeadline);
    }

    //wrap Literatur
    let grundlagenLit = $('h2.bib');
    grundlagenLit.nextAll().addBack().wrapAll('<div class="literatur"></div>');

    //Mehr lesen unter einer H3 class doc
    let grundlagenH3Headings = $('h3.doc');
    $.each(grundlagenH3Headings, function(){
      $(this).addBack().nextUntil('h3.doc').not('.literatur').wrapAll("<div class='body-collapsible'/>");
    });

    let colapsedContainer = $('.body-collapsible');
    colapsedContainer.each(function() {
      //const panelHeight = $(this).find('.panel-body').height();
      const panelHeight = $(this).height();
      if( panelHeight > 400 ) {
        $(this).addClass( 'panel-limited' );
        $(this).append('<span class="limitedspan"></span>');
        $(this).after( '<div class="panel-footer more"><a class="toggle-fullview" href="javascript:void(0)"><span class="more">Mehr</span><span class="less">Weniger</span></a></div>' )
      }
    });
    $( '.panel-footer > .toggle-fullview' ).click( function( e ) {
      $( e.target ).parent().parent().prev().toggleClass( 'fullview' );
      $(this).toggleClass('open');
    } );

    let tag = hashVal(asString);
    if(tag){
      renderFullview(tag);
    }

    $('a').click(function(){
      let intAnchor = hashVal($(this).prop('href'));
      renderFullview(intAnchor);
    });
    const litV = $('.langtext-detail.verzeichniss');
    if(!litV.length > 0){
      const accBody = $('.accordion');
      accBody.addClass('literature');
    }
      
  }
});
