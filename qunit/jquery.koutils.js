(function($, ko, undefined){

    if($ === undefined)
	console.log('jquery.koutils.js requires jQuery.');
    if(ko === undefined)
	console.log('jquery.koutils.js requires Knockout.');

    ko.tree = {};

    ////////////////////////////////////////////////////////////////////////////
    // Section: Utilities.
    //

    var make_jquery = function(elems) {
	if(!(elems instanceof jQuery))
	    elems = $(elems);
	return elems;
    }

    var make_name = function(elem, name, root) {
	if(name !== undefined)
	    return name;
	name = elem.attr('name');
	if(name === undefined) {
	    if(!root || !elem.is(root))
		throw 'Cannot create name from element without `name` attribute.';
	    return undefined;
	}
	var idx = name.lastIndexOf('-') + 1;
	var short_name = name.slice(idx);
	if(!short_name)
	    throw 'Observable name "' + name + '" reduces to empty string, from element: ' + elem;
	return short_name;
    }

    var find_parent_vm = function(elem, root) {
	root = ko.tree.get_root(root);
	var node = elem;
	for(;;) {
	    node = node.parent();
	    if(node[0] === undefined)
		throw 'DOM element has been removed.';
	    if(node[0]._tr_vm !== undefined || node.is(root))
		break;
	}
	return ko.tree.view_model(node, {
	    root: root
	});
    }

    var vm_intersection = function(par_vm, vm, root) {
	var isects = [];

	// Check each element of each property of the parent VM for branch
	// intersection with the input VM.
	for(var prop in par_vm) {
	    if(!par_vm.hasOwnProperty(prop) || prop[0] == '_' || par_vm[prop] == undefined)
		continue;
	    if(!ko.isObservable(par_vm[prop]) && !par_vm[prop]._is_vm)
		continue;

	    // Get a list of elements that use this property.
	    var children = par_vm[prop]._tr_elems;
	    if(!children)
		continue;

	    // Figure out if I split the connection from the parent VM to its
	    // child observable/VM element.
	    var is_ancestor = undefined;
	    $.each(children, function() {
		var anc_vm = find_parent_vm($(this), root);
		if(anc_vm === vm)
		    is_ancestor = true;
		else {

		    // Sanity check.
		    if(is_ancestor)
			throw 'Conflicting ancestors found.';
		}
	    });
	    if(is_ancestor)
		isects.push(prop);
	}
	return isects;
    }

    var add_obs_to_vm = function(vm, obs) {
	if(!obs._tr_name)
	    throw 'Error: Observable has no name.';
	var existing = vm[obs._tr_name];
	if(existing !== undefined && existing != obs) {
	    BRAGI.log('error:koutils', 'Cannot overwrite an observable on VMs.', {
		observable_name: obs._tr_name,
		observable: obs,
		vm: vm
	    });
	    throw new Error('Cannot overwrite an observable on VMs.');
	}
	vm[obs._tr_name] = obs;
	obs._tr_vm = vm;
    }

    var get_initial_select_value = function(elem) {

	// Keep a function for processing options, either in a group
	// or not.
	var process_options = function(elem, group) {
	    return elem.find('option').map(function() {
		var attrs = [];
		for(var ii = 0; ii < this.attributes.length; ++ii) {
		    if(this.attributes[ii].name == 'value')
			continue;
		    attrs.push({
			name: this.attributes[ii].name,
			value: this.attributes[ii].value
		    });
		}
		var obj = {
	    	    label: $(this).text(),
		    value: $(this).val(),
		    attrs: attrs
		};
		if(group)
		    obj.group = group;
		return obj;
	    }).get();
	}

	// Prepare an intial array of options.
	var opts = elem.find('optgroup').map(function() {
	    var label;
	    for(var ii = 0; ii < this.attributes.length; ++ii) {
		if(this.attributes[ii].name == 'label')
		    label = this.attributes[ii].value;
	    }
	    return process_options($(this), label);
	}).get().reduce(function(a, b) {
	    return a.concat(b);
	}, []);
	if(!opts.length)
	    opts = process_options(elem);

	return opts;
    }

    var find_vm_depth = function(vm) {
	var depth = 0;
	while(vm._tr_parent) {
	    vm = vm._tr_parent;
	    ++depth;
	}
	return depth;
    }

    var find_vm_path = function(from_vm, to_vm) {
	if(from_vm === to_vm)
	    return '';
	var from_depth = find_vm_depth(from_vm);
	var to_depth = find_vm_depth(to_vm);
	var from_path = [], to_path = [];
	while(from_depth > to_depth) {
	    from_path.push('$parent');
	    from_vm = from_vm._tr_parent;
	    --from_depth;
	}
	while(to_depth > from_depth) {
	    to_path.unshift(to_vm._tr_name);
	    to_vm = to_vm._tr_parent;
	    --to_depth;
	}
	while(from_vm != to_vm) {
	    from_path.push('$parent');
	    to_path.unshift(to_vm._tr_name);
	    from_vm = from_vm._tr_parent;
	    to_vm = to_vm._tr_parent;
	}
	var path = from_path.concat(to_path).join('.');
	if(path)
	    path += '.';
	return path;
    }

    ko.tree.utils = {}
    ko.tree.utils.make_name = make_name;
    ko.tree.utils.vm_intersection = vm_intersection;
    ko.tree.utils.find_vm_path = find_vm_path;

    ////////////////////////////////////////////////////////////////////////////
    // Section: Modifiable root element.
    //

    var root_elem = undefined;

    ko.tree.set_root = function(elem) {
	root_elem = elem;
    }

    ko.tree.get_root = function(root) {
	if(root !== undefined)
	    return root;
	if(root_elem !== undefined)
	    return root_elem;
	return $('body');
    }

    // var guid_counter = 0;
    // var get_guid = function(prefix) {
    // 	if(!prefix)
    // 	    prefix = 'guid_';
    // 	return prefix + guid_counter++;
    // }

    ////////////////////////////////////////////////////////////////////////////
    // Section: Option rendering routines.
    //

    ko.bindingHandlers.groupedOptions = {
	update: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
	    update_select_options($(element), valueAccessor()());
	}
    }

    var group_options = function(options) {
	groups = []
	$.each(options, function(ii, opt) {
	    var name = opt.group;
	    if(!name)
		name = 'No group'
	    var grp = $.grep(groups, function(g) {
		return g.name == name;
	    })[0];
	    if(grp === undefined) {
		grp = {
		    name: name,
		    options: []
		}
		groups.push(grp);
	    }
	    grp.options.push(opt);
	});
	return groups;
    }

    var render_options = function(options) {
	return $($.map(options, function(opt) {
	    var elem = $('<option value="' + opt.value + '" style="padding-left:18px;">' + opt.label + '</option>');
	    options_after_render(elem[0], opt);
	    return elem;
	})).map(function() {
	    return this.toArray();
	});
    }

    var options_after_render = function(option, item) {
	for(var ii = 0; ii < item.attrs.length; ++ii) {
	    var opt = $(option);
	    opt.attr(item.attrs[ii].name, item.attrs[ii].value);
	}
    }

    var render_groups = function(groups) {
	return $($.map(groups, function(grp) {
	    var elem = $('<optgroup label="' + grp.name + '"></optgroup>');
	    render_options(grp.options).appendTo(elem);
	    return elem;
	})).map(function() {
	    return this.toArray();
	});
    }

    var update_select_options = function(field, options) {
	var has_groups = false;
	for(var ii = 0; ii < options.length; ++ii) {
	    if(options[ii].group) {
		has_groups = true;
		break;
	    }
	}
	field.empty();
	if(has_groups)
	    render_groups(group_options(options)).appendTo(field);
	else
	    render_options(options).appendTo(field);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Section: Observable manipulation.
    //

    ko.tree.observable = function(elems, name, opts) {
	if(opts === undefined && name !== null && typeof name === 'object') {
	    opts = name;
	    name = undefined;
	}
	opts = opts || {};
	elems = make_jquery(elems);
	var results = elems.map(function() {
	    var elem = $(this);
	    var this_name = make_name(elem, name);
	    BRAGI.log('koutils', 'Adding observable to element.', {
		elem: this,
		name: this_name,
		existing_observables: this._tr_obs
	    });

	    // Convert the provided type to a KO type.
	    var ko_type;
	    if(opts.type == 'options')
		ko_type = 'groupedOptions';
	    else if(opts.type == 'disabled')
		ko_type = 'disable';
	    else
		ko_type = opts.type;

	    this._tr_obs = this._tr_obs || {};
	    this._tr_obs_types = this._tr_obs_types || {};
	    var obs = this._tr_obs[this_name];
	    if(obs === undefined) {
		BRAGI.log('koutils', 'Observable is undefined, creating.');

		// Before continuing, check that we aren't trying to overwrite an
		// existing observable of a certain type.
		if(this._tr_obs_types[ko_type] !== undefined)
		    throw new Error('Attempting to create an observable of an overlapping type, but with a different name');

		// We don't already have this observable, so create it.
		obs = opts.array ? ko.observableArray(opts.init) : ko.observable(opts.init);
		obs._tr_type = ko_type;
		obs._tr_elems = [this];
		obs._tr_name = make_name(elem, name);
		this._tr_obs[this_name] = obs;
		if(ko_type)
		    this._tr_obs_types[ko_type] = obs;
		BRAGI.log('koutils', 'Created.', {
		    type: obs._tr_type,
		    name: obs._tr_name
		});

		// If this is the root, then get the VM directly, otherwise find the
		// closest VM to add to.
		if(elem.is(ko.tree.get_root(opts.root)))
		    var vm = ko.tree.view_model(elem, {root: opts.root});
		else
		    var vm = this._tr_vm || find_parent_vm(elem, opts.root);
		add_obs_to_vm(vm, obs);
	    }
	    else {

		// We've already got this observable, run some checks.
		if(obs() !== undefined && opts.init !== undefined && obs() != opts.init)
		    throw 'Tree observable supplied conflicting initializers.';
		if((opts.array && !('push' in obs)) || (!opts.array && ('push' in obs)))
		    throw 'Tree observable created with conflicting `array` values.';
		if(name !== undefined && name != obs._tr_name)
		    throw 'Tree observable created with conflicting name.';
		if(ko_type !== undefined && this._tr_obs_types[ko_type] !== obs)
		    throw 'Tree observable created with conflicting type.';

		// Be sure we have the element in place.
		if($.inArray(this, obs._tr_elems) == -1)
		    obs._tr_elems.push(this);
	    }
	    return obs;

	}).get();
	if(results.length == 1)
	    return results[0];
	else
	    return results;
    }

    ko.tree.link = function(elems, obs, opts) {
	opts = opts || {};
	elems = make_jquery(elems);
	elems.each(function() {
	    var elem = $(this);

	    var name = obs._tr_name;
	    this._tr_obs = this._tr_obs || {}
	    if(this._tr_obs[name] !== undefined && this._tr_obs[name] !== obs)
		throw 'Trying to link a tree observable that overwrites existing observable by name.';
	    this._tr_obs[name] = obs;

	    var type = opts.type || obs._tr_type;
	    this._tr_obs_types = this._tr_obs_types || {}
	    if(this._tr_obs_types[type] !== undefined && this._tr_obs_types[type] !== obs)
		throw 'Trying to link a tree observable that overwrites existing observable by type.';
	    this._tr_obs_types[type] = obs;

	    // Be sure we have the element in place.
	    if($.inArray(elem, obs._tr_elems) == -1)
		obs._tr_elems.push(this);

	});
    }

    ////////////////////////////////////////////////////////////////////////////
    // Section: VM/Tree manipulation.
    //

    ko.tree.view_model = function(elems, opts) {
	opts = opts || {};
	var root = ko.tree.get_root(opts.root);
	elems = make_jquery(elems);
	var results = elems.map(function() {
	    var elem = $(this);

	    if(this._tr_vm !== undefined)
		return this._tr_vm;

	    var vm = {_is_vm: true};
	    vm._tr_elems = [elem[0]]; // array so is compatible with observables
	    this._tr_vm = vm;

	    // Figure out a name and store it on the VM.
	    var name = make_name(elem, opts.name, root)
	    vm._tr_name = name;

	    // Only do the following if we're not the root node.
	    if(!elem.is(root)) {
		if(!name)
		    throw 'Cannot create new VM without a name.';

		// Get the closest parent VM and then a list of all observables/VMs
		// that intersect with the new VM.
		var par_vm = find_parent_vm(elem, root);
		var isects = vm_intersection(par_vm, vm, root);

		// While we're here, set the parent VM on this VM.
		vm._tr_parent = par_vm;

		// Move the observables/VMs to the new VM.
		for(var ii = 0; ii < isects.length; ++ii) {
		    vm[isects[ii]] = par_vm[isects[ii]];
		    delete par_vm[isects[ii]];

		    // If we just moved a VM, update the parent.
		    if(!ko.isObservable(vm[isects[ii]]))
			vm[isects[ii]]._tr_parent = vm;
		}

		// Add the newly created VM to the parent.
		if(par_vm.hasOwnProperty(vm._tr_name)) {

		    // The parent VM can have a sub-VM of the same name only when
		    // we are dealing with radiobuttons, or something similar. Check
		    // if this is the case.
		    var par_elem = undefined;
		    try {
			par_elem = par_vm[prop]._tr_elems[0];
		    }
		    catch(e) {
		    }
		    if(par_elem !== undefined) {
			if(par_elem.is(':radio')) {

			    // Add this element to the list.
			    par_vm[prop]._tr_elems.push(this);
			    this._tr_vm = par_vm[prop];
			}
			else
			    par_elem = undefined;
		    }
		    if(par_elem === undefined) {
			BRAGI.log('error:koutils', 'Parent VM already has name.', {
			    parent_vm: par_vm,
			    vm: vm
			});
			throw 'Parent VM already has name: ' + vm._tr_name;
		    }
		}
		else
		    par_vm[vm._tr_name] = vm;
	    }
	    return this._tr_vm;

	}).get();
	if(results.length == 1)
	    return results[0];
	else
	    return results;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Section: Input conversion
    //

    ko.tree.convert_input = function(elems, opts) {
	opts = opts || {};
	var root = ko.tree.get_root(opts.root);
	elems = make_jquery(elems);
	var results = elems.map(function() {
	    var elem = $(this);

	    // Check if we were given a specific type to convert to. If not,
	    // add all the types to the list to try and convert to everything.
	    var types = opts.types || ['value', 'checked', 'disabled', 'options'];
	    if(types.constructor !== Array)
		types = [types];

	    // Before fetching or creating the VM, check if there is already a parent
	    // VM with an element of the same name. We need to do this to prevent radio
	    // selects freaking everything out.
	    var vm, link = false;
	    var name = make_name(elem);
	    var par_vm = find_parent_vm(elem);
	    if(elem.is(':radio') && par_vm.hasOwnProperty(name)) {
		vm = par_vm[name];
		link = true;

		// Add the element to the other VM and set the VM on the element.
		if($.inArray(this, vm._tr_elems) == -1)
		    vm._tr_elems.push(this);
		this._tr_vm = vm;
	    }

	    // Convert the element to a VM.
	    else
		vm = ko.tree.view_model(elem, {root: root});

	    // Process each type.
	    for(var ii = 0; ii < types.length; ++ii) {
		var type = types[ii];

		// Skip if it already exists and this element exists in the
		// element list of the observable.
		if(vm.hasOwnProperty(type) && ko.isObservable(vm[type])) {
		    if($.inArray(this, vm[type]._tr_elems) != -1)
			continue;
		}

		// Prevent invalid observables being created.
		if(type == 'options' && !elem.is('select'))
		    continue;
		if(type == 'value' && elem.is(':radio'))
		    continue;
		if(type == 'checked' && !elem.is(':radio'))
		    continue;

		// Get the initial value, depending on what type we are creating.
		var init;
		if(type == 'options')
		    init = get_initial_select_value(elem);
		else if(type == 'checked') {
		    if(elem.prop('checked'))
			init = elem.val();
		}
		else if(type == 'value')
		    init = elem.val();
		else if(type == 'disabled')
		    init = elem.prop('disabled');

		var array = type == 'options';

		// If this is a radio input we need to be careful we don't try
		// to overwrite an existing conversion from one of its siblings.
		if(link && par_vm[name].hasOwnProperty(type)) {
		    ko.tree.link(elem, par_vm[name][type]);

		    // Update the value if we have one.
		    if(init !== undefined)
			par_vm[name][type](init);
		}
		else
		    ko.tree.observable(elem, type, {root: root, type: type, init: init});
	    }
	    return vm;

	}).get();
	if(results.length == 1)
	    return results[0];
	else
	    return results;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Section: Binding
    //

    ko.tree.wrap_with = function(elem, context) {
	$('<!-- ko with: ' + context + ' -->').insertBefore(elem);
	$('<!-- /ko -->').insertAfter(elem);
    }

    ko.tree.update_databind = function(elem, new_bind, prefix) {
	var bind = elem.attr('data-bind');
	if(bind === undefined)
	    bind = '';
	if(bind) {
	    if(prefix)
		bind = ', ' + bind;
	    else
		bind += ', ';
	}
	if(prefix)
	    bind = new_bind + bind;
	else
	    bind += new_bind;
	elem.attr('data-bind', bind);
    }

    ko.tree.apply_observable = function(elem, obs, vm) {
	if(obs._tr_type) {
	    var path = find_vm_path(vm, obs._tr_vm);
	    ko.tree.update_databind(elem, obs._tr_type + ': ' + path + obs._tr_name);
	}
    }

    ko.tree.apply_bindings = function(root) {

	// Need to walk the DOM.
	var walk = function(node, vm) {

	    // Process this node's observables.
	    if(node[0]._tr_obs !== undefined) {
		$.each(node[0]._tr_obs, function(type, obs) {
		    ko.tree.apply_observable(node, obs, vm);
		});
	    }

	    // Continue walking the DOM.
	    node.children().each(function() {
		var $this = $(this);

		// Get the VM for the child element.
		var child_vm = this._tr_vm;
		if(child_vm !== undefined && child_vm !== vm) {

		    // Move up a level
		    ko.wrap_with($this, child_vm._tr_name);
		    walk($this, child_vm);
		}
		else
		    walk($this, vm);
	    });
	}

	root = ko.tree.get_root(root);
	vm = root[0]._tr_vm;
	if(vm === undefined)
	    return;
	walk(root, vm);

	BRAGI.log('koutils', 'Applying KO bindings.', {root_vm: vm});
	ko.applyBindings(vm, root[0]);
    }

    //
    //
    //

    ko.observable_name_from_field = function(field) {
	var name = field.attr('name');
	if(name === undefined)
	    throw 'Cannot create name from field without `name` attribute.';
	var idx = name.lastIndexOf('-') + 1;
	var short_name = name.slice(idx);
	if(!short_name)
	    throw 'Observable name "' + name + '" reduces to empty string, from field: ' + field[0];
	return short_name;
    }

    ko.get_observable_name = function(field, re) {
	var name = field.attr('data-bind');
	if(name) {
	    name = name.match(re);
	    if(name)
		name = name[1];
	    else
		name = undefined;
	}
	return name;
    }

    ko.update_databind = function(field, new_bind, prefix) {
	var bind = field.attr('data-bind');
	if(bind === undefined)
	    bind = '';
	if(bind) {
	    if(prefix)
		bind = ', ' + bind;
	    else
		bind += ', ';
	}
	if(prefix)
	    bind = new_bind + bind;
	else
	    bind += new_bind;
	field.attr('data-bind', bind);
    }

    ko.wrap_with = function(elem, context) {
	$('<!-- ko with: ' + context + ' -->').insertBefore(elem);
	$('<!-- /ko -->').insertAfter(elem);
    }

    ko.add_observable = function(elem, name, vm) {
	BRAGI.log('koutils', 'Adding observable:', {
	    element: elem,
	    name: name
	});
	vm = ko.get_vm(elem, undefined, vm);
	if(!vm.hasOwnProperty(name)) {
	    vm[name] = ko.observable();
	    vm[name]._name = name;
	    vm[name]._vm = vm;
	}
	add_elem_to_obs(elem, vm[name]);
	return vm[name];
    }

    ko.add_disabled_observable = function(field, vm) {
	vm = ko.get_vm(field, undefined, vm);
	var obs_name = ko.get_observable_name(field, /disable:\s*(\w+),?/);
	if(!obs_name) {
	    obs_name = 'disabled';
	    ko.update_databind(field, 'disable: ' + obs_name);
	}
	if(!vm.hasOwnProperty(obs_name)) {
	    vm[obs_name] = ko.observable(field.prop('disabled'));
	    vm[obs_name]._name = obs_name;
	    vm[obs_name]._vm = vm;
	}
	add_elem_to_obs(field, vm[obs_name]);
	return vm[obs_name];
    }

})(jQuery, ko);

$(window).load(function() {

    // var parents = function(node) {
    // 	var nodes = [node];
    // 	for(; node; node = node.parentNode)
    // 	    nodes.unshift(node);
    // 	return nodes;
    // }

    // var common_ancestor = function(node1, node2) {
    // 	var parents1 = parents(node1);
    // 	var parents2 = parents(node2);
    // 	if(parents1[0] != parents2[0])
    // 	    return null;
    // 	for(var i = 0; i < parents1.length; i++) {
    // 	    if(parents1[i] != parents2[i])
    // 		return parents1[i - 1];
    // 	}
    // }

    // // Collect a set of unique VMs.
    // var all_vms = [];
    // var dm = ko.get_dom_mapping();
    // for(var prop in dm) {
    // 	if(dm.hasOwnProperty(prop)) {
    // 	    if($.inArray(dm[prop], all_vms) == -1)
    // 		all_vms.push(dm[prop]);
    // 	}
    // }

    // // Process each VM to find the common ancestor of each element
    // // involved.
    // for(var ii = 0; ii < all_vms.length; ++ii) {
    // 	var vm = all_vms[ii];
    // 	var elems = [];
    // 	for(var prop in all_vms[ii]) {
    // 	    if(!vm.hasOwnProperty(prop))
    // 		continue;
    // 	    var obs = vm[prop];
    // 	    if(!obs.hasOwnProperty('_elems'))
    // 		continue;
    // 	    for(var jj = 0; jj < obs._elems.length; ++jj ) {
    // 		var e = obs._elems[jj];
    // 		if($.inArray(e[0], elems) == -1)
    // 		    elems.push(e[0]);
    // 	    }
    // 	}

    // 	// Now actually find the common ancestor.
    // 	var anc = null;
    // 	if(elems.length == 1)
    // 	    anc = elems[0];
    // 	else if(elems.length > 1) {
    // 	    anc = elems[0];
    // 	    elems.shift();
    // 	    while(elems.length > 0) {
    // 		anc = common_ancestor(anc, elems[0]);
    // 		elems.shift();
    // 	    }
    // 	}
    // 	if(anc == null)
    // 	    throw 'No ancestor.'

	// // Apply the bindings.
	// ko.applyBindings(vm, anc);
    // }

});
