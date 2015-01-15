QUnit.test('set_options identifies knockout', function(assert) {
    $.mockjax({
	url: '/test',
	responseText: {
	    status: 200,
	    statusText: 'OK',
	    content: [
		{
		    label: 'Five',
		    pk: 5,
		    observables: 'hello'
		},
		{
		    label: 'Six',
		    pk: 6,
		    observables: 'world'
		}
	    ]
	}
    });
    var elem = $('#select').find('#child');
    $('#select').koform();
    elem.autoajax();
    elem.autoajax('fetch', elem);
    var vm = $('#select').data('koform').vm;
    var opts = vm.child_options();
    assert.equal(opts.length, 2);
    // assert.equal(opts[0].text, 'Three');
    // assert.equal($(opts[0]).val(), '3');
    // assert.equal($(opts[0]).attr('another'), 'blah');
    // assert.equal($(opts[1]).text(), 'Four');
    // assert.equal($(opts[1]).val(), '4');
    // assert.equal($(opts[1]).attr('more'), 'even');
    // var opts = $('#select option');
    // assert.equal(opts.length, 2);
    // assert.equal($(opts[0]).text(), 'Three');
    // assert.equal($(opts[0]).val(), '3');
    // assert.equal($(opts[0]).attr('another'), 'blah');
    // assert.equal($(opts[1]).text(), 'Four');
    // assert.equal($(opts[1]).val(), '4');
    // assert.equal($(opts[1]).attr('more'), 'even');
});

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
