(function($, undefined){

    var options_after_render = function(option, item) {
	for(var ii = 0; ii < item.attrs.length; ++ii) {
	    var opt = $(option);
	    opt.attr(item.attrs[ii].name, item.attrs[ii].value);
	}
    }

    var init_select = function(select, name, vm) {

	// Prepare an intial array of options.
	var opts = select.find('option').map(function() {
	    var $this = $(this);
	    return {
	    	text: $this.text(),
		attrs: this.attributes
	    };
	}).get();

	// Create the obvervable.
	vm[name + '_options'] = ko.observableArray(opts);

	// Modify the data-bind attribute.
	var bind = select.attr('data-bind');
	if(bind === undefined)
	    bind = '';
	if(bind)
	    bind += ', ';
	bind += 'options: ' + name + '_options, ';
	bind += 'optionsText: \'text\', ';
	bind += 'optionsAfterRender: options_after_render'
	select.attr('data-bind', bind);
    }

    var methods = {

 	///
	/// Initialise the plugin.
	///
	init: function(options) {
	    return this.each(function() {
	        var $this = $(this);

	        // Prepare plugin data if not already done.
	        var data = $this.data('koform');
	        if(!data) {
	            $this.data('koform', $.extend({
                        vm: {}
	            }, options));
	            data = $this.data('koform');
	        }

		// Add the global function to render options to the VM.
		data.vm.options_after_render = options_after_render;

		// Before running module-specific initialisation, register
		// each of the module's fields with the VM.
		methods.register_fields.call($this);

                // Don't forget to apply the bindings.
                ko.applyBindings(data.vm, this);
	    });
	},

	///
	/// Finalise the plugin.
	///
	destroy: function() {
	    return this.each(function() {
	        var $this = $(this);
	        var data = $this.data('koform');
	        data.koform.remove();
	        $this.removeData('koform');
	    });
	},

	///
	///
	///
	register_fields: function() {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('koform');
		$this.find(':input').each(function(){
		    var input = $(this);
		    var name = input.attr('name');

		    // In most cases we want to use just the field name in this
		    // form instance, not the prefix from any formsets, etc.
		    var idx = name.lastIndexOf('-') + 1;
		    name = name.slice(idx);

		    // Don't register if the name is empty.
		    if(name) {
			var init = input.val();
		    	data.vm[name] = ko.observable(init);
		    	input.attr('data-bind', 'value: ' + name);

			// If this is a select we also want to use an
			// observable array to handle options.
			if(input.is('select'))
			    init_select(input, name, data.vm);
		    }
		});
	    });
	}
    }

    ///
    /// Method dispatch.
    ///
    $.fn.koform = function(method) {
	if(methods[method]) {
	    return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
	}
	else if(typeof method === 'object' || !method) {
	    return methods.init.apply(this, arguments);
	}
	else {
	    $.error('Method ' + method + 'does not exist on jQuery.koform');
	}
    }

})(jQuery);

$(function() {

    $('.koform').koform();

});
