// ==UserScript==
// @name         ACFUN NDQ BAN
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  NDQ Ban
// @author       null
// @match        http://www.acfun.cn/v/*
// @match        http://www.aixifan.com/v/*
// @match        http://hengyang.aixifan.com/v/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var ndq = document.getElementById('goniudan');
    ndq.style.display = 'none';
})();
