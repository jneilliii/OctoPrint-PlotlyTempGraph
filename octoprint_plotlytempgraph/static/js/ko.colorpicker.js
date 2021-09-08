ko.bindingHandlers.colorPicker = {
  init: function(element, valueAccessor) {
    var value = valueAccessor();
    $(element).val(ko.utils.unwrapObservable(value));
    $(element).spectrum({preferredFormat: "hex", showInput: true, allowEmpty:true});
    $(element).change(function() { value(this.value); });
  },
  update: function(element, valueAccessor) {
    $(element).val(ko.utils.unwrapObservable(valueAccessor()));
  }
}
