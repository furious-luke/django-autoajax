import simplejson as json
from django import forms
from django.utils.encoding import force_text
from django.utils.html import format_html, escapejs

class DependentSelect(forms.Select):

    class Media:
        js = ('autoajax/js/jquery.autoajax.js',)

    def __init__(self, parent, *args, **kwargs):
        attrs = kwargs.setdefault('attrs', {})
        attrs['class'] = (' ' if attrs.get('class', '') else '') + 'autoajax'
        attrs['data-parent-field'] = parent
        attrs['data-observables'] = ','.join(kwargs.pop('observables', []))
        super(DependentSelect, self).__init__(*args, **kwargs)

class ObservableSelect(forms.Select):

    class Media:
        js = ('autoajax/js/jquery.autoajax.js',)

    def __init__(self, *args, **kwargs):
        attrs = kwargs.setdefault('attrs', {})
        attrs['class'] = (' ' if attrs.get('class', '') else '') + 'autoajax'
        attrs['data-observables'] = ','.join(kwargs.pop('observables', []))
        super(ObservableSelect, self).__init__(*args, **kwargs)

    def render_option(self, selected_choices, option_value, option_label):
        option_value, obs_dict = option_value
        if option_value is None:
            option_value = ''
        option_value = force_text(option_value)
        if option_value in selected_choices:
            selected_html = mark_safe(' selected="selected"')
            if not self.allow_multiple_selected:
                # Only allow for a single selection.
                selected_choices.remove(option_value)
        else:
            selected_html = ''
        if obs_dict:
            observables = escapejs(json.dumps(obs_dict, cls=json.encoder.JSONEncoderForHTML))
        else:
            observables = ''
        return format_html('<option data-observables="{}" value="{}"{}>{}</option>',
                           observables,
                           option_value,
                           selected_html,
                           force_text(option_label))
