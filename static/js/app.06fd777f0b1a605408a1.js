webpackJsonp([1],{"8xdG":function(t,e){},H1vv:function(t,e){},Kml0:function(t,e){},NHnr:function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a("lRwf"),i=a.n(n),s={name:"App",created:function(){Cookies.set("lang","en");var t=Cookies.get("lang");this.$i18n.locale=t?"zh":t}},r={render:function(){var t=this.$createElement,e=this._self._c||t;return e("div",{attrs:{id:"app"}},[e("router-view")],1)},staticRenderFns:[]};var o=a("VU/8")(s,r,!1,function(t){a("H1vv")},null,null).exports,c=a("pRNm"),u=a.n(c),l={render:function(){var t=this,e=t.$createElement,a=t._self._c||e;return a("div",{staticClass:"total-header flex-space-container"},[a("div",{staticClass:"header-title"},[a("a",{staticClass:"h-title-href",attrs:{href:"/"}},[t._v(t._s(t.$t("header.title")))])]),t._v(" "),a("div",{staticClass:"header-tags flex-container"},t._l(t.tagsList,function(e,n){return a("div",{key:n,staticClass:"tags-item"},[a("router-link",{staticClass:"tags-item-ani flex-container",attrs:{to:"/"}},[a("i",{class:["fa","fa-"+e.icon]}),t._v(t._s(e.title))])],1)}),0)])},staticRenderFns:[]};var d=a("VU/8")({data:function(){return{}},filters:{},computed:{tagsList:function(){return[{path:"/home",title:this.$t("header.tags.home"),icon:"home"},{path:"/my",title:this.$t("header.tags.my"),icon:"user"}]}},created:function(){},methods:{}},l,!1,function(t){a("Kml0")},"data-v-62a4edc2",null).exports,h=(new i.a,{name:"HomeFrame",components:{vHeader:d},data:function(){return{msg:"ooo"}},created:function(){}}),v={render:function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"app-container"},[e("vHeader"),this._v(" "),e("transition",{attrs:{name:"move",mode:"out-in"}},[e("keep-alive",[e("router-view")],1)],1)],1)},staticRenderFns:[]};var f=a("VU/8")(h,v,!1,function(t){a("fHAG")},"data-v-6da382b4",null).exports,m={name:"analogInput",props:{value:{type:String,default:"我爱我的祖国"}},data:function(){return{val:this.value,wSpace:200,dSpace:100,cursorSpeed:500,cursorStatus:!1}},filters:{},computed:{},created:function(){this.val=this.value,this.cursorAni(),this.forwardAni()},methods:{timeAni:function(t,e){var a=Date.now(),n=!0;!function i(){var s=Date.now();s-a>=e&&(a=s,n=!t||!t()),n&&requestAnimationFrame(i)}()},cursorAni:function(){var t=this;this.timeAni(function(){t.cursorStatus=!t.cursorStatus},this.cursorSpeed)},forwardAni:function(){var t=this,e=t.wSpace,a=t.value,n=a.length;t.val="",t.timeAni(function(){var e=t.val.length;if(e<n&&(t.val=a.substring(0,e+1)),e==n)return setTimeout(function(){t.reversalAni()},2e3),!0},e)},reversalAni:function(){var t=this,e=t.dSpace;t.value.length;t.timeAni(function(){var e=t.val,a=e.length;if(a>=0&&(t.val=e.substring(0,a-1)),0==a)return t.forwardAni(),!0},e)}}},p={render:function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"analog-input-box"},[this._v("\n  "+this._s(this.val)+"\n  "),e("span",{staticClass:"cursor-style",style:{opacity:this.cursorStatus?1:0}},[this._v("|")])])},staticRenderFns:[]};var g={name:"HelloWorld",components:{analogInput:a("VU/8")(m,p,!1,function(t){a("8xdG")},"data-v-1d71b35f",null).exports},data:function(){return{msg:"ooo"}}},_={render:function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"home-container"},[e("div",{staticClass:"home-warp flex-row-center-container"},[e("div",{staticClass:"wrap-info"},[e("div",{staticClass:"main-title"},[this._v(this._s(this.$t("header.title")))]),this._v(" "),e("analogInput",{staticClass:"analog-sub-title",attrs:{value:this.$t("header.subTitle")}})],1),this._v(" "),this._m(0)])])},staticRenderFns:[function(){var t=this.$createElement,e=this._self._c||t;return e("div",{staticClass:"arrow-down"},[e("i",{staticClass:"fa fa-chevron-down",attrs:{"aria-hidden":"true"}})])}]};var w=a("VU/8")(g,_,!1,function(t){a("uzRw")},"data-v-6132d5ba",null).exports;i.a.use(u.a);var C=new u.a({routes:[{path:"/",name:"frame",component:f,meta:{title:"首页"},children:[{path:"/",name:"home",component:w}]}]}),A=a("mtWM"),E=a.n(A),x=a("7JE7"),y=a.n(x),$=(a("j1ja"),a("Dd8w")),b=a.n($);i.a.use(VueI18n);var R={en:b()({},{header:{title:"Naughtiness",subTitle:"Never put off till tomorrow what you can do today",tags:{home:"Home",my:"My"}}},ELEMENT.lang.en),zh:b()({},{header:{title:"皮一下",subTitle:"今日事，今日毕",tags:{home:"首页",my:"我的"}}},ELEMENT.lang.zhCN)},H=new VueI18n({locale:"zh",messages:R});i.a.use(ELEMENT,{i18n:function(t,e){return H.t(t,e)}});var S=H;i.a.config.productionTip=!1,i.a.prototype.$axios=E.a,i.a.prototype.$qs=y.a,new i.a({el:"#app",router:C,i18n:S,components:{App:o},template:"<App/>"})},fHAG:function(t,e){},lRwf:function(t,e){t.exports=Vue},pRNm:function(t,e){t.exports=VueRouter},uzRw:function(t,e){}},["NHnr"]);