(function(){
'use strict';
// Mini player (384×216) da lista "Ao vivo e música". A lista fica no app.js (var estacoes);
// cada botão .estacao traz data-video (vídeo) ou data-canal ("ao vivo do canal", como a CNN Brasil).
var player=null,ready=false,apiReady=false,loading=false,wanted=false,loadTimer=null;
var atual=null,modo=null,carregado=null;
var status=document.getElementById('video-status'),nomeAtual=document.getElementById('video-station');
var RADIO='Essa rádio saiu do ar ou não deixa tocar aqui. Escolha outra.';
var CNN='A CNN Brasil não está ao vivo agora. Tente mais tarde.';
// erro=true pinta a mensagem de coral (design.md §6).
function say(text,erro){status.textContent=text;status.className=erro?'erro':'';}
function escolher(btn){
  if(atual){atual.classList.remove('tocando');atual.removeAttribute('aria-current');}
  atual=btn;btn.classList.add('tocando');btn.setAttribute('aria-current','true');
  nomeAtual.textContent=btn.querySelector('.nome').textContent;nomeAtual.className='';
}
function esperar(){clearTimeout(loadTimer);loadTimer=setTimeout(function(){if(!ready)say('O YouTube não respondeu. A conexão ou a incorporação pode estar bloqueada.',true);},20000);}
function carregarApi(){if(loading)return;loading=true;say('Carregando o player do YouTube…');var script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=function(){loading=false;say('Não foi possível conectar ao YouTube. Tente novamente.',true);};document.head.appendChild(script);esperar();}
// Cria o player para o item atual. O "ao vivo do canal" usa videoId 'live_stream' + playerVars.channel;
// como loadVideoById não serve para ele, ao trocar entre canal e vídeo o player é destruído e recriado.
function criar(){
  var canal=atual.getAttribute('data-canal'),video=atual.getAttribute('data-video'),vars={playsinline:1,autoplay:0,origin:location.origin};
  if(player){try{player.destroy();}catch(e){}player=null;}
  ready=false;
  var velho=document.getElementById('mini-player'),novo=document.createElement('div');
  if(velho)velho.parentNode.removeChild(velho);
  novo.id='mini-player';document.querySelector('.video-frame').appendChild(novo);
  if(canal)vars.channel=canal;
  modo=canal?'canal:'+canal:'video';carregado=canal?null:video;
  esperar();
  player=new YT.Player('mini-player',{width:384,height:216,videoId:canal?'live_stream':video,playerVars:vars,events:{
    onReady:function(e){if(e.target!==player)return;ready=true;clearTimeout(loadTimer);say('Player carregado.');if(wanted)tocar();},
    onStateChange:function(e){if(e.target!==player)return;if(e.data===1)say('Reproduzindo · navegue pelo painel com as setas.');else if(e.data===2)say('Vídeo pausado.');else if(e.data===0)say('Vídeo finalizado.');},
    onAutoplayBlocked:function(e){if(e.target!==player)return;say('O YouTube bloqueou o início automático. Selecione Reproduzir novamente.');},
    onError:function(e){
      if(e.target!==player)return;clearTimeout(loadTimer);
      // 153 é falta de identificação do site (versão local), não é a CNN fora do ar.
      if(modo!=='video'&&e.data!==153){say(CNN,true);return;}
      var messages={100:RADIO,101:RADIO,150:RADIO,153:'O YouTube exige identificação de um site. Esta versão local precisa de hospedagem para reproduzir.',5:'Reprodução não suportada pelo player nesta TV.'};
      say(messages[e.data]||'Erro do YouTube: '+e.data+'.',true);
    }
  }});
}
// Toca o item atual: se for URL, abre no navegador; senão carrega a API, recria o player se mudou entre canal e vídeo, ou troca o vídeo.
function tocar(){
  var url=atual.getAttribute('data-url');
  if(url){
    if(typeof PalmServiceBridge!=='undefined'){
      var bridge=new PalmServiceBridge();
      bridge.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:'com.webos.app.browser',params:{target:url}}));
    }else{window.location.href=url;}
    return;
  }
  wanted=true;
  if(!apiReady){carregarApi();return;}
  var canal=atual.getAttribute('data-canal'),video=atual.getAttribute('data-video');
  if(!player||modo!==(canal?'canal:'+canal:'video')){criar();return;}
  if(!ready)return; // o onReady toca quando o player ficar pronto
  if(!canal&&carregado!==video){carregado=video;player.loadVideoById(video);}
  else player.playVideo();
}
window.onYouTubeIframeAPIReady=function(){apiReady=true;if(atual)criar();};
document.getElementById('playlist').addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('.estacao'):null;
  if(!b)return;
  var url=b.getAttribute('data-url');
  if(url){
    if(typeof PalmServiceBridge!=='undefined'){
      var bridge=new PalmServiceBridge();
      bridge.call('luna://com.webos.applicationManager/launch',JSON.stringify({id:'com.webos.app.browser',params:{target:url}}));
    }else{window.location.href=url;}
    return;
  }
  escolher(b);tocar();
});
document.getElementById('video-play').addEventListener('click',function(){if(!atual){var primeiro=document.querySelector('.estacao');if(!primeiro)return;escolher(primeiro);}tocar();});
document.getElementById('video-pause').addEventListener('click',function(){wanted=false;if(ready)player.pauseVideo();});
document.getElementById('video-stop').addEventListener('click',function(){wanted=false;if(ready){player.stopVideo();say('Vídeo parado.');}});
document.addEventListener('visibilitychange',function(){if(document.hidden){wanted=false;if(ready)player.pauseVideo();}});
})();
