from django.conf.urls import url
from .forms import DependentSelect

class AutoAjaxSite(object):

    def __init__(self):
        self._registry = []
        self._urls = None

    def make_urls(self):
        urls = []
        for app, form_cls, field_name, field in self._registry:
            form_name = form_cls.__name__.lower()
            path = 'autoajax/' + '/'.join([app.name, form_name, field_name])
            urls.append(url('^%s$'%path, field.as_view()))
            if isinstance(field.widget, DependentSelect):
                field.widget.attrs['data-url'] = '/' + path
        self._urls = urls

    @property
    def urls(self):
        if self._urls is None:
            self.make_urls()
        return self._urls, 'autoajax', 'autoajax'

site = AutoAjaxSite()
