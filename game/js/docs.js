(a(this).removeClass(m.options.overClass).removeClass(m.options.placeholderClass).removeClass(m.options.childClass),m.dragenterData(this,!1))}),a("html").removeClass(m.options.dragMovingClass),k(),m.options.stop(this),m.trigger("sortable-stop",[m]),f.remove(),f=null},w=b(function(b){return o&&o!==this&&p!==this?(l.removeClass(m.options.overClass),p=this,m.options.warp?a(this).addClass(m.options.overClass):m.moveElementNextTo(o,this),e(b)):!0});j?(n.addEventListener("dragstart",q,!1),n.addEventListener("dragenter",s,!1),n.addEventListener("dragleave",t,!1),n.addEventListener("drop",u,!1),n.addEventListener("dragover",r,!1),n.addEventListener("dragend",v,!1)):n.addEventListener(i?"touchstart":"mousedown",q,!1)},dragenterData:function(b,c){return b=a(b),1==arguments.length?parseInt(b.attr("data-child-dragenter"),10)||0:void(c?b.attr("data-child-dragenter",Math.max(0,c)):b.removeAttr("data-child-dragenter"))},moveElementNextTo:function(b,d){var e=this,f=a(b).parent().css("min