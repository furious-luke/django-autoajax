import os, importlib
from django.apps import apps
from django.forms import BaseForm
from .forms import AutoAjaxField

def discover_ajax_fields():
    fields = []
    for app in apps.get_app_configs():
        path = os.path.basename(app.path) + '.forms'
        try:
            mod = importlib.import_module(path)
        except ImportError as e:
            if not e.message.startswith('No module named') or not e.message.endswith('forms'):
                raise
            continue
        for name, cls in mod.__dict__.iteritems():
            if not isinstance(cls, type):
                continue
            if not issubclass(cls, BaseForm):
                continue
            for name, field in cls.base_fields.iteritems():
                if isinstance(field, AutoAjaxField):
                    fields.append((app, cls, name, field))
    return fields
