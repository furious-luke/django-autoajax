from django.utils.module_loading import autodiscover_modules
from .sites import site
from .discover import discover_ajax_fields

def autodiscover():
    site._registry = discover_ajax_fields()

default_app_config = 'autoajax.apps.AutoAjaxConfig'
