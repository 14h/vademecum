'use strict'
/* */
$(document).ready(function () {
  let inputFields = $('input');
  let selectFields = $('select');

  function changedValues( items ){
    items.each(function (){
      $(this).on('change', function(e){
        let string = $(this).val();
        if($(this).val().length > 0 ){
          $(this).addClass('active');
        }
        else{
          $(this).removeClass('active');
        }
      });
    });
  }
  if(inputFields){
    changedValues(inputFields);
  }
});
