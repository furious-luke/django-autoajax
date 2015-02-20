QUnit.test('`init` subscribes to value observable', function(assert) {
    var root = $('#init-0');
    ko.tree.set_root(root);
    var elem = root.find('#parent');
    elem.autoajax();
    var obs = elem[0]._tr_obs.value;
    ko.tree.apply_bindings();
    assert.notEqual(obs, undefined);
});

QUnit.test('`init` subscribes to value of existing observable', function(assert) {
    var root = $('#init-1');
    ko.tree.set_root(root);
    var elem = root.find('#parent');
    var existing = ko.tree.observable(elem, 'value', {type: 'value'});
    assert.notEqual(existing, undefined);
    elem.autoajax();
    var obs = elem[0]._tr_obs.value;
    ko.tree.apply_bindings();
    assert.equal(obs, existing);
    obs('2');
});

QUnit.test('`init` subscribes to disabled observable', function(assert) {
    var root = $('#init-2');
    ko.tree.set_root(root);
    var elem = root.find('#parent');
    elem.autoajax();
    var obs = elem[0]._tr_obs.disabled;
    ko.tree.apply_bindings();
    assert.notEqual(obs, undefined);
    assert.equal(elem.prop('disabled'), false);
    assert.equal(obs(), false);
    obs(true);
    assert.equal(elem.prop('disabled'), true);
    assert.equal(obs(), true);
});

// QUnit.test('set_options identifies knockout', function(assert) {
//     $.mockjax({
// 	url: '/test',
// 	responseText: {
// 	    status: 200,
// 	    statusText: 'OK',
// 	    content: [
// 		{
// 		    label: 'Five',
// 		    pk: 5,
// 		    observables: 'hello'
// 		},
// 		{
// 		    label: 'Six',
// 		    pk: 6,
// 		    observables: 'world'
// 		}
// 	    ]
// 	}
//     });
//     var elem = $('#select').find('#child');
//     $('#select').koform();
//     elem.autoajax();
//     elem.autoajax('fetch', elem);
//     var vm = $('#select').data('koform').vm;
//     var opts = vm.child_options();
//     assert.equal(opts.length, 2);
//     // assert.equal(opts[0].text, 'Three');
//     // assert.equal($(opts[0]).val(), '3');
//     // assert.equal($(opts[0]).attr('another'), 'blah');
//     // assert.equal($(opts[1]).text(), 'Four');
//     // assert.equal($(opts[1]).val(), '4');
//     // assert.equal($(opts[1]).attr('more'), 'even');
//     // var opts = $('#select option');
//     // assert.equal(opts.length, 2);
//     // assert.equal($(opts[0]).text(), 'Three');
//     // assert.equal($(opts[0]).val(), '3');
//     // assert.equal($(opts[0]).attr('another'), 'blah');
//     // assert.equal($(opts[1]).text(), 'Four');
//     // assert.equal($(opts[1]).val(), '4');
//     // assert.equal($(opts[1]).attr('more'), 'even');
// });

// QUnit.test('set_options falls back to HTML', function(assert) {
// });

// QUnit.test('set_options_knockout sets values', function(assert) {
//     $('#select').koform();
//     var vm = $('#select').data('koform').vm;
//     vm.a_select_options([]);
//     assert.equal($('#select option').length, 0);
//     vm.a_select_options([
// 	{
// 	    text: 'Three',
// 	    attrs: [
// 		{
// 		    name: 'value',
// 		    value: '3'
// 		},
// 		{
// 		    name: 'another',
// 		    value: 'blah'
// 		}
// 	    ]
// 	},
// 	{
// 	    text: 'Four',
// 	    attrs: [
// 		{
// 		    name: 'value',
// 		    value: '4'
// 		},
// 		{
// 		    name: 'more',
// 		    value: 'even'
// 		}
// 	    ]
// 	}
//     ]);
//     var opts = $('#select option');
//     assert.equal(opts.length, 2);
//     assert.equal($(opts[0]).text(), 'Three');
//     assert.equal($(opts[0]).val(), '3');
//     assert.equal($(opts[0]).attr('another'), 'blah');
//     assert.equal($(opts[1]).text(), 'Four');
//     assert.equal($(opts[1]).val(), '4');
//     assert.equal($(opts[1]).attr('more'), 'even');
// });
