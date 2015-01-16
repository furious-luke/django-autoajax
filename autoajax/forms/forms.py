import inspect
import simplejson as json
from importlib import import_module
from django import forms
from django.http import Http404
from django.utils.html import escapejs
from django.utils.translation import ugettext_lazy as _
from django_ajax.decorators import ajax
from .widgets import *

__all__ = ['AutoAjaxField', 'DependentModelChoiceField', 'ObservableModelChoiceField',
           'AutoAjaxFormMixin']

class AutoAjaxField(object):

    def load_decorators(self):
        decs = []
        for path in self.decorators:
            names = path.split('.')
            path = '.'.join(names[:-1])
            mod = import_module(path)
            dec = getattr(mod, names[-1])
            decs.append(dec)
        return decs

    def as_view(self):

        @ajax
        def view(request, *args, **kwargs):
            pk = request.GET.get('pk', None)
            if pk is None:
                raise Http404
            objs = self.model.objects.filter(**{self.filter: pk})
            opts = []
            for o in objs:
                opt = {}
                opt['value'] = o.pk
                if self.label_field:
                    opt['label'] = str(getattr(o, self.label_field))
                else:
                    opt['label'] = str(o)
                if self.group_field:
                    opt['group'] = str(getattr(o, self.group_field))
                opt['attrs'] = {}
                obs_dict = {}
                for obs in self.observables:
                    obs_dict[obs] = getattr(o, obs)
                if obs_dict:
                    opt['attrs'] = [{
                        'name': 'data-observables',
                        'value': escapejs(json.dumps(obs_dict, cls=json.encoder.JSONEncoderForHTML)),
                    }]
                opts.append(opt)
            return opts

        decs = self.load_decorators()
        for d in decs:
            view = d(view)
        return view

class DependentModelChoiceField(AutoAjaxField, forms.ModelChoiceField):

    def __init__(self, *args, **kwargs):
        self.model = kwargs.pop('model')
        self.parent = kwargs.pop('parent')
        self.observables = kwargs.pop('observables', [])
        self.decorators = kwargs.pop('decorators', [])
        self.filter = kwargs.pop('filter', None)
        if self.filter is None:
            self.filter = self.parent
        self.label_field = kwargs.pop('label_field', None)
        self.group_field = kwargs.pop('group_field', None)
        kwargs['queryset'] = self.model.objects.none()
        kwargs['empty_label'] = None
        widget = kwargs.get('widget', None)
        if widget:
            if inspect.isclass(widget):
                widget = widget()
            widget.attrs['class'] = ' '.join(widget.attrs.get('class', '').split() + ['autoajax'])
            widget.attrs['data-parent-field'] = self.parent
            widget.attrs['data-observables'] = ','.join(widget.attrs.get('observables', []) + self.observables)
            kwargs['widget'] = widget
        else:
            kwargs['widget'] = DependentSelect(self.parent, observables=self.observables)
        super(DependentModelChoiceField, self).__init__(*args, **kwargs)

    def to_python(self, value):
        self.queryset = self.model.objects.all()
        try:
            res = super(DependentModelChoiceField, self).to_python(value)
        finally:
            self.queryset = self.model.objects.none()
        return res

class ObservableModelChoiceField(forms.ModelChoiceField):

    def __init__(self, *args, **kwargs):
        self.observables = kwargs.pop('observables', [])
        kwargs['widget'] = ObservableSelect(observables=self.observables)
        super(ObservableModelChoiceField, self).__init__(*args, **kwargs)

    def prepare_value(self, value):
        obs_dict = dict([(o, getattr(value, o, '')) for o in self.observables])
        if hasattr(value, '_meta'):
            if self.to_field_name:
                return (value.serializable_value(self.to_field_name), obs_dict)
            else:
                return (value.pk, obs_dict)
        return (super(forms.ModelChoiceField, self).prepare_value(value), obs_dict)

class AutoAjaxFormMixin(object):

    def clean(self):
        cleaned_data = super(AutoAjaxFormMixin, self).clean()
        for bnd_field in self:
            field = bnd_field.field
            if isinstance(field, AutoAjaxField):
                pk = cleaned_data[bnd_field.name]
                par_pk = cleaned_data.get(field.parent, None)
                if par_pk is None:
                    continue
                try:
                    obj = field.model.objects.get(**{field.filter: par_pk, 'pk': pk.pk})
                except field.model.DoesNotExist:
                    err = forms.ValidationError(_('Not a valid choice'), code='invalid')
                    self.add_error(bnd_field.name, err)
