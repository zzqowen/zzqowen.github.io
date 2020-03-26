var browser = {
  versions: function () {
    {
      var a = navigator.userAgent;
      navigator.appVersion
    }
    return {
      trident: a.indexOf("Trident") > -1,
      presto: a.indexOf("Presto") > -1,
      webKit: a.indexOf("AppleWebKit") > -1,
      gecko: a.indexOf("Gecko") > -1 && -1 == a.indexOf("KHTML"),
      mobile: !!a.match(/AppleWebKit.*Mobile.*/),
      ios: !!a.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/),
      android: a.indexOf("Android") > -1,
      iPhone: a.indexOf("iPhone") > -1,
      iPad: a.indexOf("iPad") > -1,
      webApp: -1 == a.indexOf("Safari")
    }
  }(),
  supportH5: function () {
    var a = !1;
    return navigator.geolocation && (a = !0), a
  }(),
  supportFlash: function () {
    if (navigator.mimeTypes.length > 0) {
      var a = navigator.mimeTypes["application/x-shockwave-flash"];
      return void 0 !== a ? void 0 !== a.enabledPlugin : !1
    }
    if (self.ActiveXObject) try {
      return new ActiveXObject("ShockwaveFlash.ShockwaveFlash"), !0
    } catch (b) {
      return !1
    }
  }(),
  language: (navigator.browserLanguage || navigator.language).toLowerCase()
}