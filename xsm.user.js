// ==UserScript==
// @name         XSM简易查询可用量
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  通过模拟点击来查询可用量。
// @author       soys
// @match        https://*.xinshangmeng.com/eciop/orderForCC/cgtListForCC.htm?*
// @match        https://*.xinshangmeng.com/eciop/orderForCC/cgtOtherListForCC.htm?*
// @match        http://*.xinshangmeng.com/eciop/orderForCC/cgtListForCC.htm?*
// @match        http://*.xinshangmeng.com/eciop/orderForCC/cgtOtherListForCC.htm?*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    var pname = document.getElementsByClassName('page-name')[0];
    if (pname.innerHTML == '增加卷烟'){
    alert('下单前请注意：\n如需批量查看订购量和可用量，请点击需求量旁的 +/- 符号，点完后再点下空白处即可完全生效。');
    }
    // Your code here...

    var req = document.getElementById('req-btn');
    var XQL = document.getElementsByClassName('xsm-order-list-shuru-input');
    req.innerHTML = req.innerHTML + '[<a>+</a>]  [<a>-</a>]';
    var reqA = req.getElementsByTagName('a');
    var accinfo = document.getElementsByClassName('xsm-pribtn');
window.onload = function(){
        reqA[0].onclick = function (){
            var i=0;
            for(i=0;i<XQL.length+1;i++){
            document.getElementsByClassName('adda')[i].click();
            document.getElementsByClassName('xsm-order-list-shuru-input')[i].click();
            }
            accinfo[0].click();
        }
        reqA[1].onclick = function (){
            var i=0;
            for(i=0;i<XQL.length+1;i++){

            document.getElementsByClassName('suba')[i].click();
            document.getElementsByClassName('xsm-order-list-shuru-input')[i].click();

            }
            accinfo[0].click();
        }

    }
})();
