// ==UserScript==
// @name         漫画区漫画隐藏页数显示
// @namespace    http://127.0.0.1/
// @version      0.1
// @description  将漫画区隐藏的漫画显示出来
// @author       Molishark
// @match        http://www.acfun.cn/a/ac*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    function getClass(classname){
	if (document.getElementsByClassName) {
		//使用现有方法
		return document.getElementsByClassName(classname);
	}else{
		//定义一个数组放classname
		var results = new Array();
		//获取所有节点元素
		var elem = document.getElementsByTagName("*");
		for (var i = 0; i < elem.length; i++) {
			if (elem[i].className.indexOf(classname) != -1) {
				results[results.length] = elem[i];
			}
		}
		return results;
	}
}
    var acontent = getClass('article-content')[0];
    var acp = acontent.getElementsByTagName('p');
    var xianshi = getClass('action-up')[0];
    xianshi.style = 'width:100px;height:18px;float:right;margin-top:-35px;';
    xianshi.innerHTML = '<a onclick="gg();">显示</a>'+xianshi.innerHTML;
    function gg(){
        for(var i=0;i<acp.length;i++){
            if(acp[i].style.display == 'none'){
                acp[i].style.display = 'block';
            }
        }
    }
    /*for(var i=0;i<acp.length;i++){
         if(acp[i].style.display == 'none'){
             acp[i].style.display = 'block';
        }
    }*/
    // Your code here...
})();
