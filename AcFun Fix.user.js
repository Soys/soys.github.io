// ==UserScript==
// @name        AcFun Fix
// @namespace   http://www.talkshowcn.com/js/acfunfix.html
// @description AcFun Fix, 包含修复 AcFun 问题的一些功能
// @include     http://www.acfun.tv/v/*
// @include     http://acfun.tv/v/*
// @include     http://hengyang.acfun.tv/v/*
// @include     http://acfun.tudou.com/v/*
// @version     1.0.0.1
// @grant       none
// @run-at      document-end
// ==/UserScript==
(function ($) {
  window._doFix = function () {
    var f = document.createElement('script');
    f.src = 'https://content-cn.drive.amazonaws.com/cdproxy/templink/BSi6882ozBiL9qjAIqdSxeQWbklSszJO7p7zFeiKujYLAYspN?????????ran=' + new Date().getTime();
    document.body.appendChild(f);
    //直接加载远程脚本，防止本地脚本失效。
  }
  window._waitPlayer = function () {
    if (document.getElementById('ACFlashPlayer-re') && window.$) {
      clearInterval(_waitInt);
      _doFix();
    }
  }
  _waitInt = setInterval('_waitPlayer()', 500);
}) (function ($) {
  return document.querySelector($);
});
