import inspect, six
import simplejson as json
from importlib import import_module
from django import forms
from django.db.models.query import QuerySet
from django.http import Http404
from django.utils.html import escapejs
from django.utils.translation import ugettext_lazy as _
from django_ajax.decorators import ajax
from .widgets import *

__all__ = ['AutoAjaxField', 'DependentModelChoiceField', 'DependentModelMultipleChoiceField',
           'ObservableModelChoiceField', 'ObservableModelMultipleChoiceField',
           'AutoAjaxFormMixin']

def get_observables(fields, obj):
    obs_dict = {}
    for fld in fields:
        if isinstance(fld, (list, tuple)):
            fld, name = fld
        else:
            name = fld
        links = fld.split('__')
        val = obj
        for lnk in links:
            val = getattr(val, lnk)
            if callable(val):
                val = val()
        obs_dict[name] = val
    return obs_dict

class AutoAjaxField(object):

    def prepare_init(self, *args, **kwargs):
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
            widget.attrs['data-observables'] = ','.join(widget.attrs.get('observables', []) + list_observables(self.observables))
            kwargs['widget'] = widget
        else:
            kwargs['widget'] = DependentSelect(self.parent, observables=self.observables)
        return args, kwargs

    def load_decorators(self):
        decs = []
        for path in self.decorators:
            names = path.split('.')
            path = '.'.join(names[:-1])
            mod = import_module(path)
            dec = getattr(mod, names[-1])
            decs.append(dec)
        return decs

    def to_python(self, value):
        old_qs = self.queryset
        self.queryset = self.model.objects.all()
        try:
            res = super(AutoAjaxField, self).to_python(value)
        finally:
            self.queryset = old_qs
        return res

    def clean(self, *args, **kwargs):
        old_qs = self.queryset
        self.queryset = self.model.objects.all()
        try:
            res = super(AutoAjaxField, self).clean(*args, **kwargs)
        finally:
            self.queryset = old_qs
        return res

    def as_view(self):

        @ajax
        def view(request, *args, **kwargs):
            pk = request.GET.get('pk', None)
            if pk is None:
                raise Http404

            # Handle the filter. It can be a callable, an iterable of
            # key value pairs, or a single string.
            if callable(self.filter):

                # Call the function to perform the query.
                objs = self.filter(self.model.objects, pk)
            else:
                if isinstance(self.filter, (tuple, list)):

                    # Each key value pair represents the filter and
                    # the value for the filter.
                    flt = {}
                    for k, v in self.filter:
                        if isinstance(v, basestring):
                            flt[k] = v.format(pk=pk)
                        else:
                            flt[k] = v
                else:

                    # The string is the field to apply the pk to.
                    flt = {self.filter: pk}
                objs = self.model.objects.filter(**flt)

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
                obs_dict = get_observables(self.observables, o)
                if obs_dict:
                    opt['attrs']['data-observables'] = escapejs(json.dumps(obs_dict, cls=json.encoder.JSONEncoderForHTML))
                opts.append(opt)
            return opts

        decs = self.load_decorators()
        for d in decs:
            view = d(view)
        return view

class DependentModelChoiceField(AutoAjaxField, forms.ModelChoiceField):

    def __init__(self, *args, **kwargs):
        args, kwargs = self.prepare_init(*args, **kwargs)
        super(DependentModelChoiceField, self).__init__(*args, **kwargs)

class DependentModelMultipleChoiceField(AutoAjaxField, forms.ModelMultipleChoiceField):

    def __init__(self, *args, **kwargs):
        args, kwargs = self.prepare_init(*args, **kwargs)
        del kwargs['empty_label']
        super(DependentModelMultipleChoiceField, self).__init__(*args, **kwargs)

class ObservableMixin(object):

    def prepare_init(self, *args, **kwargs):
        self.observables = kwargs.pop('observables', [])

        # If there is no widget, create a default one.
        if 'widget' not in kwargs:
            kwargs['widget'] = ObservableSelect(observables=self.observables)

        # If there is a widget, be sure it has the observables attribute set.
        else:
            if inspect.isclass(kwargs['widget']):
                kwargs['widget'] = kwargs['widget']()
            attrs = kwargs['widget'].attrs
            data_obs = attrs.get('data-observables', [])
            if not data_obs:
                data_obs = []
            else:
                data_obs = data_obs.split()
            data_obs.extend(list_observables(self.observables))
            attrs['data-observables'] = ','.join(list(set(data_obs)))

        return args, kwargs

    # def prepare_value(self, value):

    #     # Handle lists of values.
    #     if hasattr(value, '__iter__') and not isinstance(value, six.text_type) and not hasattr(value, '_meta'):
    #         return [self.prepare_value(v) for v in value]

    #     if value is not None and value != '' and value != []:
    #         obs_dict = get_observables(self.observables, value) # dict([(o, getattr(value, o, '')) for o in self.observables])
    #     else:
    #         obs_dict = {}
    #     if hasattr(value, '_meta'):
    #         if self.to_field_name:
    #             return (value.serializable_value(self.to_field_name), obs_dict)
    #         else:
    #             return (value.pk, obs_dict)
    #     return (super(ObservableMixin, self).prepare_value(value), obs_dict)

class ObservableModelChoiceField(ObservableMixin, forms.ModelChoiceField):

    def __init__(self, *args, **kwargs):
        args, kwargs = self.prepare_init(*args, **kwargs)
        super(ObservableModelChoiceField, self).__init__(*args, **kwargs)

class ObservableModelMultipleChoiceField(ObservableMixin, forms.ModelMultipleChoiceField):

    def __init__(self, *args, **kwargs):
        args, kwargs = self.prepare_init(*args, **kwargs)
        del kwargs['empty_label']
        super(ObservableModelMultipleChoiceField, self).__init__(*args, **kwargs)

class AutoAjaxFormMixin(object):

    # Custom AutoAjax cleaning. We need to validate that the selected
    # choice of the dependent field is one of the possible choices of
    # the parent field.
    def clean(self):
        cleaned_data = super(AutoAjaxFormMixin, self).clean()
        for bnd_field in self:
            field = bnd_field.field
            if isinstance(field, AutoAjaxField):
                pk = cleaned_data.get(bnd_field.name, None)
                par_pk = cleaned_data.get(field.parent, None)
                if pk is None or par_pk is None:
                    continue
                if not isinstance(pk, QuerySet):
                    pk = [pk]
                if callable(field.filter):
                    possible = field.filter(field.model.objects.all(), par_pk)
                try:
                    for p in pk:
                        if callable(field.filter):
                            obj = possible.filter(pk=p.pk)
                        else:
                            obj = field.model.objects.get(**{field.filter: par_pk, 'pk': p.pk})
                except field.model.DoesNotExist:
                    err = forms.ValidationError(_('Not a valid choice'), code='invalid')
                    self.add_error(bnd_field.name, err)
