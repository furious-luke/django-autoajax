from django.apps import AppConfig
from django.utils.translation import ugettext_lazy as _

class AutoAjaxConfig(AppConfig):
    name = 'autoajax'
    verbose_name = _('Automatic AJAX')

    def ready(self):
        super(AutoAjaxConfig, self).ready()
        self.module.autodiscover()
