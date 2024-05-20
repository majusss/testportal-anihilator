try {
  const original = RegExp.prototype.test;
  RegExp.prototype.test = function (s) {
    if (
      this.toString().includes("native code") &&
      this.toString().includes("function")
    ) {
      //all is fine man just continue
      return true;
    }

    const r = original.call(this, s);
    return r;
  };
  document.hasFocus = function () {
    return true;
  };
} catch (error) {
  console.error(error);
}
