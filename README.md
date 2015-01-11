# django-autoajax

AutoAjax tries to further reduce the amount of code required to
implement AJAX form fields in Django. The key feature is automatic
generation of Django views.

This is still in pretty early stages, so it will probably error
on you.

## Installation

Installation is via the usual `setup.py` channels:

```bash
cd django-autoajax
python setup.py install
```

You will also need to add `autoajax` to your `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
  ...
  'autoajax',
]
```

For the client-side you will need jQuery available in your templates.

## Form fields

Currently there is only one useful form field available,
`DependentModelChoiceField`. This field allows a form to create
a field that loads its choices dynamically from the server
dependent on the selection of another field. Currently the
independent field must also be a model field.

### Creating the form

Suppose we have two simple models:

```python
class Manager(models.Model):
  pass

class Client(models.Model):
  manager = models.ForeignKey(Manager)
```

We can create a form that dynamically loads available client choices
from the server using AJAX based on a selected manager as follows:

```python
from django import forms
from autoajax.forms import DependentModelChoiceField, AutoAjaxFormMixin
from .models import Manager, Client

class TestForm(AutoAjaxFormMixin, forms.Form):
  manager = forms.ModelChoiceField(Manager.objects.all())
  client  = DependentModelChoiceField(
    model=Client,
    parent='manager',
    decorators=['django.contrib.auth.decorators.login_required'],
  )
```

This automatically prepares the necessary view for the AJAX request
and handles validating the field. All that is needed is to populate your
URL patterns:

```python
import autoajax

urlpatterns = [
  ...
  url(r'^', include(autoajax.site.urls)),
]
```

### Usage in templates

To use the form we only need to make sure we include the media:

```html
<head>
{% form.media %}
</head>
<body>
  <form>
    {{ form }}
  </form>
</body>
```
