(function($, undefined){

    var reset_value = function(elem) {
	var data = elem.data('autoajax');
	BRAGI.log('autoajax:' + elem.attr('name'), 'Resetting value.', {
	    current_value: elem.val(),
	    previous_value: data.value_bak
	});
	elem.val(data.value_bak);
	ko.tree.observable(elem, 'value')(data.value_bak);
	if(data.parent)
	    reset_value(data.parent);
    }

    var methods = {

 	///
	/// Initialise the plugin.
	///
	init: function(options) {
	    return this.each(function() {
	        var $this = $(this);

	        // Prepare plugin data if not already done.
	        var data = $this.data('autoajax');
	        if(!data) {
	            $this.data('autoajax', $.extend({
                        parent: undefined,
                        children: [],
                        url: undefined,
                        disabled: 0,
                        event_set: false,
                        vm: {}
	            }, options));
	            data = $this.data('autoajax');

		    BRAGI.log('autoajax:' + $this.attr('name'), 'Initializing AutoAjax: ', {
			element: this,
			url: data.url,
		    });

                    // Store the URL.
                    data.url = $this.attr('data-url');

		    // Backup the value immediately.
		    data.value_bak = $this.val();

		    // Before adding our observables to the element, be sure we
		    // have created a VM on this element to hold our local values.
		    data.vm = ko.tree.view_model($this);

                    // Find the parent field.
                    var par_name = $this.attr('data-parent-field');
                    if(par_name) {
                        var next = $this;
                        var par = undefined;
                        do {
                            par = next.find('[id$="' + par_name + '"]');
                            next = next.parent();
                        } while(par.length == 0 && next.length > 0);
                        if(par === undefined)
		    	    throw 'Parent not found: ' + par_name;
                        data.parent = par;

                        // Before continuing, make sure our parent is constructed.
                        par.autoajax();

                        // Add myself as a child of the parent.
                        par.autoajax('add_child', $this);

			// Automatically disable the widget to prevent changes.
			$this.prop('disabled', true);
                    }

		    // We need KO options, disabled and value observables.
		    ko.tree.convert_input($this);
		    data.disabled_obs = ko.tree.get_observable($this, 'disabled');
		    data.options_obs = ko.tree.get_observable($this, 'options');
		    data.value_obs = ko.tree.get_observable($this, 'value');

		    // Subscribe to the value observable so that when it changes
		    // for any reason we can propagate to children.
                    if(!$this.event_set) {
                        $this.event_set = true;
		    	data.value_obs.subscribe(function(val) {

			    // Be sure this has actually changed. Sometimes at the start
			    // this gets called for apparently no reason.
			    if(val != data.value_bak) {
				BRAGI.log('autoajax:' + $this.attr('name'), 'UI element has changed.');
		    		methods.changed.call($this, val);
			    }
			    else
			    	BRAGI.log('warning:autoajax:' + $this.attr('name'), 'Bogus UI element change.');
		    	    return true;
                        });
                    }
                }
	    });
	},

	///
	/// Finalise the plugin.
	///
	destroy: function() {
	    return this.each(function() {
	        var $this = $(this);
	        var data = $this.data('autoajax');
	        data.autoajax.remove();
	        $this.removeData('autoajax');
	    });
	},

	///
	///
	///
	initial: function() {
	    return this.each(function() {
		var $this = $(this);
                var data = $this.data('autoajax');

                // If the parent has a value, we must immediately query
                // for the options.
                if(data.parent) {
		    var par_val = data.parent.val();
		    if(par_val !== undefined && par_val !== null) {
			BRAGI.log('autoajax:' + $this.attr('name'), 'Parent has initial value, calling `changed`.', {
			    value: par_val
			});
                        methods.changed.apply(data.parent);
		    }
                }
	    });
	},

	///
	///
	///
	changed: function(val) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
		val = val || $this.val();

		// If we're already processing a change, then don't
		// restart another one.
		// TODO: Handle this better, i.e. cancel existing update and
		// start a new one.
		if(!data.disabled) {
		    BRAGI.log('autoajax:' + $this.attr('name'), 'Change called.');
                    if(data.children.length)
			methods.disable.apply($this);
                    methods.update.call($this, $this);
		}
		else
		    BRAGI.log('autoajax:' + $this.attr('name'), 'Change ignored.');
	    });
	},

	///
	///
	///
	update: function(source) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');

		BRAGI.log('autoajax:' + $this.attr('name'), 'Update called.');
                for(var ii = 0; ii < data.children.length; ++ii)
                    methods.fetch.call(data.children[ii], source);
	    });
	},

	///
	///
	///
	disable: function(direction) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');

		BRAGI.log('autoajax:' + $this.attr('name'), 'Disabling, updated to: ', data.disabled + 1);
                ++data.disabled;
		data.disabled_obs(true);
                if((!direction || direction == 'from_child') && data.parent)
                    methods.disable.call(data.parent, 'from_child');
                if(!direction || direction == 'from_parent') {
                    for(var ii = 0; ii < data.children.length; ++ii)
                        methods.disable.call(data.children[ii], 'from_parent');
                }
	    });
	},

	///
	///
	///
	enable: function(direction) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');

		BRAGI.log('autoajax:' + $this.attr('name'), 'Enabling, updated to: ', data.disabled - 1);
                if(--data.disabled == 0) {
		    data.disabled_obs(false);
		    // Update the backup value here, because we have just finished
		    // a round of updating.
		    data.value_bak = $this.val();
		}
                if((!direction || direction == 'from_child') && data.parent)
                    methods.enable.call(data.parent, 'from_child');
                if(!direction || direction == 'from_parent') {
                    for(var ii = 0; ii < data.children.length; ++ii)
                        methods.enable.call(data.children[ii], 'from_parent');
                }
	    });
	},

	///
	///
	///
	fetch: function(source) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');

		if(!data.parent)
		    console.error('No parent set on child element, cannot fetch.');

		// Get the parent value and check for empty. If empty, clear.
                var pk = data.parent.val();
                if(!pk) {
                    data.options_obs([]);
                    return;
                }

		// AJAX part.
                var url = data.url;
                var send = {
                    pk: pk
                };
                ++source.data('autoajax').disabled;
		BRAGI.log('autoajax:' + $this.attr('name'), 'Requesting data from server: ', send);

		// Peform the fetch.
                $.getJSON(url, send, function(result) {
		    content = result['content'];
		    BRAGI.log('autoajax:' + $this.attr('name'), 'Data received: ', content);
		    if(result.status != 200) {
			BRAGI.log('autoajax:' + $this.attr('name'), 'AJAX transfer failed.');
			console.error('Failed to complete AJAX transfer.');
		    }
		    else {
			data.options_obs(content);
			// set_options_knockout($this, data, content);
			methods.update.call($this, source);
		    }
                }).fail(function() {
		    BRAGI.log('autoajax:' + $this.attr('name'), 'AJAX transfer failed.');
		    console.error('Failed to complete AJAX transfer.');
		    reset_value(data.parent);
                }).always(function() {
                    // console.log('Del\'d: ' + (source.data('autoajax').disabled - 1));
                    if(--source.data('autoajax').disabled == 1)
                        methods.enable.apply(source);
                });
	    });
	},

	///
	///
	///
	add_child: function(child) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
                data.children.push(child);
	    });
	},
    }

    ///
    /// Method dispatch.
    ///
    $.fn.autoajax = function(method) {
	if(methods[method]) {
	    return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
	}
	else if(typeof method === 'object' || !method) {
	    return methods.init.apply(this, arguments);
	}
	else {
	    $.error('Method ' + method + 'does not exist on jQuery.autoajax');
	}
    }

})(jQuery);

$(function() {

    // $('.autoajax').autoajax();

});

$(window).load(function() {

    // // We can't test for initial parent values until here because
    // // we need to wait for all children to be registered with their
    // // parents.
    // $('.autoajax').autoajax('initial');

});
