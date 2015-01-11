(function($, undefined){

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

                    // Store the URL.
                    data.url = $this.attr('data-url');

                    // Produce a list of observables.
                    var obs = $this.attr('data-observables');
                    if(obs) {
                        obs = obs.split(',');
                        for(var ii = 0; ii < obs.length; ++ii) {
                            data.vm[$.trim(obs[ii])] = ko.observable();
                            // console.log('Adding observable "' + obs[ii] + '" to "' + $this.attr('id'));
                        }
                    }

                    // Find the parent field.
                    var par_name = $this.attr('data-parent-field');
                    if(par_name) {
                        var next = $this;
                        var par = undefined;
                        do {
                            par = next.find('[id$="' + par_name + '"]');
                            next = next.parent();
                        } while(par.length == 0 && next.length > 0);
                        if(par === undefined) {
                            console.error('Parent not found: ' + par_name);
                            return;
                        }
                        data.parent = par;

                        // Before continuing, make sure our parent is constructed.
                        par.autoajax();

                        // Add myself as a child of the parent.
                        par.autoajax('add_child', $this);
                    }
                    else {
                        methods.update_observables.apply($this);
                    }

                    // Set events.
                    if(!$this.event_set) {
                        $this.event_set = true;
                        $this.change(function() {
                            methods.changed.apply($this);
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
                // for the options. If not, we disable until such time as
                // the parent does have a value.
                if(data.parent) {
                    var par_val = data.parent.val();
                    if(par_val)
                        methods.changed.apply(data.parent);
                    else
                        $this.prop('disabled', true);
                }
	    });
	},

	///
	///
	///
	changed: function() {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
                // console.log('Changed: ' + $this.attr('id'));
                if(data.children.length)
                    methods.disable.apply($this);
                methods.update.call($this, $this);
	    });
	},

	///
	///
	///
	update: function(source) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
                // console.log('Update: ' + $this.attr('id'));
                methods.update_observables.apply($this);
                for(var ii = 0; ii < data.children.length; ++ii)
                    methods.fetch.call(data.children[ii], source);
	    });
	},

	///
	///
	///
	update_observables: function() {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
                var sel = $this.find(':selected');
                var obs = sel.attr('data-observables');
                if(obs) {
                    obs = $.parseJSON($.parseJSON('"' + obs + '"'));
                    $.each(obs, function(key, val) {
                        if(!data.vm.hasOwnProperty(key)) {
                            console.error('No such observable: ' + key);
                            return true;
                        }
                        data.vm[key](val);
                        // console.log('Updated ' + key + ' to ' + val);
                    });
                }
	    });
	},

	///
	///
	///
	disable: function(direction) {
	    return this.each(function() {
		var $this = $(this);
		var data = $this.data('autoajax');
                // console.log('Disable: ' + $this.attr('id'));
                ++data.disabled;
                $this.prop('disabled', true);
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
                // console.log('Enable: ' + $this.attr('id'));
                if(--data.disabled == 0)
                    $this.prop('disabled', false);
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
                var pk = data.parent.val();
                if(!pk) {
                    $this.empty();
                    return;
                }
                var url = data.url;
                var send = {
                    pk: pk
                };
                ++source.data('autoajax').disabled;
                // console.log('Added: ' + source.data('autoajax').disabled);
                $.getJSON(url, send, function(result) {
                    content = result['content'];
                    $this.empty();
                    $.each(content, function(ii, obj) {
                        var opt = $('<option>').text(obj.label).attr('value', obj.pk);
                        if(obj.hasOwnProperty('observables'))
                            opt.attr('data-observables', obj.observables);
                        $this.append(opt);
                    });
                    $this.find('option').first().prop('selected', true);
                    methods.update.call($this, source);
                }).fail(function() {
                    console.error('Failed to fetch dependencies.');
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

    $('.autoajax').autoajax();
    $('.autoajax').autoajax('initial');

});
