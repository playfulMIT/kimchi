import json

from .models import URL, CustomSession


def get_group(self, data_json):
    print("get_group start session: ")
    print(self.customsession.__dict__)

    print("from db:")
    print(CustomSession.objects.get(session_key=self.key).__dict__)
    namedata = data_json["data"]
    namejson = json.loads(namedata)
    if self.customsession.url is not None:
        print("urlpk found: ")
        url = self.customsession.url
        print("url: " + str(url.pk))
    else:
        urlname = "no-url-or-group-specified"
        print("urlpk not found, using default")
        url, created = URL.objects.get_or_create(name=urlname)
        self.customsession.url = url

    # overeride if group is specified
    if "group" in namejson:
        urlname = namejson["group"]
        print("group override")
        url, created = URL.objects.get_or_create(name=urlname)
        self.customsession.url = url

    print(url.name)
    self.customsession.save(update_fields=["url"])
    self.scope["session"].accessed = False
    self.scope["session"].modified = False
    print("get_group end session: ")
    print(self.customsession.__dict__)
    return url, namejson
