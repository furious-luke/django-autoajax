import simplejson as json
from django import forms
from django.utils.encoding import force_text
from django.utils.html import format_html, escapejs
from django.utils.safestring import mark_safe

def list_observables(observables):
    obs_list = []
    for obs in observables:
        if isinstance(obs, (list, tuple)):
            obs_list.append(obs[1])
        else:
            obs_list.append(obs)
    return obs_list

def join_observables(observables):
    return ','.join(list_observables(observables))

class AutoAjaxWidgetMixin(object):

    def render(self, name, value, attrs=None):
        if isinstance(value, (list, tuple)):
            value = ','.join([str(v) for v in value])
        elif value is not None:
            value = value
        if value not in (None, []):
            attrs['autoajax-initial'] = value
        return super(AutoAjaxWidgetMixin, self).render(name, None, attrs)

class DependentSelect(AutoAjaxWidgetMixin, forms.Select):

    class Media:
        js = ('autoajax/js/jquery.autoajax.js',)

    def __init__(self, parent, *args, **kwargs):
        attrs = kwargs.setdefault('attrs', {})
        attrs['class'] = (' ' if attrs.get('class', '') else '') + 'autoajax'
        attrs['data-parent-field'] = parent
        attrs['data-observables'] = join_observables(kwargs.pop('observables', []))
        super(DependentSelect, self).__init__(*args, **kwargs)

class ObservableMixin(object):

    class Media:
        js = ('autoajax/js/jquery.autoajax.js', 'tao/js/jquery.select_observables.js')

    def __init__(self, *args, **kwargs):
        attrs = kwargs.setdefault('attrs', {})
        attrs['class'] = ' '.join(attrs.get('class', '').split() + ['autoajax'])
        attrs['data-observables'] = join_observables(kwargs.pop('observables', []))
        super(ObservableMixin, self).__init__(*args, **kwargs)

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

    def render_options(self, choices, selected_choices):
        if selected_choices is not None:
            new_sel = []
            for c in selected_choices:
                if isinstance(c, (list, tuple)):
                    new_sel.append(c[0])
                else:
                    new_sel.append(c)
            selected_choices = new_sel
        return super(ObservableMixin, self).render_options(choices, selected_choices)

    # def render(self, *args, **kwargs):
    #     import pdb
    #     pdb.set_trace()
    #     return super(ObservableMixin, self).render(*args, **kwargs)

class ObservableSelect(ObservableMixin, forms.Select):
    pass

class ObservableSelectMultiple(ObservableMixin, forms.SelectMultiple):
    pass
