(function(){
  function getParam(name){
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  }
  function hideXpraUI(){
    // If toolbar=no, hide all Xpra UI chrome
    const toolbar = getParam('toolbar');
    const border = getParam('border');
    if(toolbar === 'no' || border === 'no'){
      const menu = document.getElementById('float_menu');
      if(menu){ menu.style.display = 'none'; }
      const tray = document.getElementById('float_tray');
      if(tray){ tray.style.display = 'none'; }
      const notif = document.querySelector('.notifications');
      if(notif){ notif.style.display = 'none'; }
      // Remove any margins/padding on screen
      const screen = document.getElementById('screen');
      if(screen){ screen.style.margin = '0'; screen.style.padding = '0'; }
      // Remove overflow that may show scrollbars
      document.body.style.margin = '0';
      document.body.style.padding = '0';
      document.documentElement.style.overflow = 'hidden';
    }
  }
  // Run after DOM loaded
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', hideXpraUI);
  }else{
    hideXpraUI();
  }
})();
