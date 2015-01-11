def to_list(value):
    if value is None:
        return []
    elif isinstance(value, (str, unicode, dict)):
        return [value]
    else:
        return list(value)
