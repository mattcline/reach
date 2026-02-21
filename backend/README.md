# Backend

Note: type `python3` and `pip3` instead of `python` and `pip` if you have both Python 2 AND 3 installed.

## Commands

### Django

#### Run server
`python3 manage.py runserver`

#### Run interactive shell
`python3 manage.py shell`

#### Seed DB
`python3 manage.py seed`

#### Run tests
`python3 manage.py test`


### Redis
`redis-cli`

View all keys: `KEYS *`

View specific key: `lrange <key> 0 -1`

Clear db: `FLUSHDB`

### Stripe
Run Stripe webhook locally

`stripe listen --forward-to localhost:8000/payments/webhook/`

## Setup

#### Install Homebrew packages
`brew install python`
`brew install redis`

#### Create virtual environment
`python3 -m venv .venv`

#### Activate the virtual environment
`source .venv/bin/activate`

To deactivate, type `source deactivate`

#### Install pip-tools 
`pip3 install pip-tools`

This command allows you to download the rest of the packages

#### Install Python packages
`pip3 install -r requirements.txt`

#### Start Redis
`brew services start redis`

Note: if you can an error, try restarting your computer

#### Install Postgres
`brew install postgresql@17`

Make sure to add the required flags to shell configuration file

#### Start Postgres
`brew services start postgresql@17`

#### Run Postgres
`psql`

You might get an error that database `<username>` does not exist. If so, run `createdb <username>` to create the database.

#### Create database
In psql interactive shell, run 

`CREATE DATABASE pairdraft;`

#### Run migrations
`python3 manage.py migrate`

#### Run Django
`python3 manage.py runserver`

You're ready 🥳

### Adding a new envionment variable
1. Add it to `.env`
2. Add it to the pairdraft service in the Railway dashboard (Settings -> Environment Variables)

### Adding a new Python package
1. Add it to `requirements.in`
2. Run `pip-compile requirements.in`

### Testing on mobile
1. Make sure your phone is on the same network as your computer
2. Identify the IP address of your computer (Settings -> Network -> Wi-Fi -> Details)
3. Add the IP address to `MOBILE_HOST` in settings.py
4. Update the 'Run Server - Mobile' run config in launch.json to use the IP address
5. On the frontend, update `BACKEND_URL` and `WEBSOCKET_URL` to use the IP address

## Models

### Adding a new model
1. Create the model
2. If it is a public facing model, create a UUID field for the model (it is difficult to change the id field to a UUID field later)
3. Add it to clear_database() in seed.py if applicable
4. If it has editable fields that are exposed to the frontend via a form, add ModelWithFormFields to the model declaration and implement get_form_fields() in the model

### Adding a new preference
1. Add it as a field to the Preferences model
2. Add it to the corresponding type list in Preferences
3. Add it to PreferencesSerializer in 'fields'

### Converting an id field to a uuid field
1. Create new uuid field in model
2. Generate migration file
3. Edit migration file to change current id field to uuid and rename uuid field to id (see properties/migrations/0002_alter... for an example)

## Django

### Rename an app
https://stackoverflow.com/questions/8408046/how-to-change-the-name-of-a-django-app
Note: Comment out the release command (migration command) in the Procfile before pushing changes to prod

```
UPDATE django_content_type SET app_label='inbox' WHERE app_label='messaging';

-- for all models in the app
ALTER TABLE messaging_message RENAME TO inbox_message;

UPDATE django_migrations SET app='inbox' WHERE app='messaging';
```

### Delete a model
Run `remove_stale_contenttypes` manage command to clear entries from `django_content_type` and `auth_permission` tables

### Delete an app
https://docs.djangoproject.com/en/5.1/howto/delete-app/

Also run `remove_stale_contenttypes` manage command (like we do when just deleting a single model)

### Reset migrations for an app
(should not be necessary, but just in case)

0. Remove the release command to run migrations from the Procfile
1. Delete all migration files (besides __init__.py) in a particular Django app
2. Run `makemigrations <app name>`
Note: you might need to comment out dependencies in migration files from other apps first
3. Update migration files from other apps that reference the app you are resetting
i.e. if you're resetting app A and app B has a dependency on migration 0002_...py in app A 
in one of app B's migration files, update the dependency to 0001_initial


4. (Perform this step and following steps both locally AND on prod) Delete migrations from django_migrations table
for the app you are resetting AS WELL AS any dependent apps
`DELETE FROM django_migrations WHERE app=<app name>;`

5. Fake migration
Run for the app you are resetting AND it's dependencies (make sure to run the reset app first before its dependencies):
Local: `./manage.py migrate <app name> --fake`
Prod: `hm migrate <app name> -a pairdraft -- --fake`

6. Add the release command back to the Procfile

## Database

### Resetting the database
1. Delete all migration files (besides the __init__.py files) in a particular Django app or all apps
2. psql
3. DROP DATABASE pairdraft;
4. CREATE DATABASE pairdraft;

## Railway
1. `railway login`
2. `railway link`
3. `railway ssh`
4. `source /opt/venv/bin/activate`

## Good to know
- If you're loading POST data in Viewsets (in create(), etc.), load `request.data` directly instead of `json.loads(request.body)`
- Use DRF's Response object when possible, and JsonResponse when not (i.e. in Django views)
- Do not include '.' or a quote in a 'title' field for a step in the config since it will cause the frontend to not find the id of the step
- When deleting an object, do so in Django admin and not Postico so that it triggers
cascade deletions and signals
- When using Enum, make sure to append `.value` to the enum to get the value
- When adding a new price id in Stripe, make sure to update the 'price_id' field in the Product model with the new price id, update the 'price' field in the Product model with the new price, update the environment variables in both Railway and Vercel
- Avoid using unique_together in models because it can cause issues with migrations
- Make migration files as small as possible, i.e. don't add multiple changes to a single migration file

## Common Errors

#### ASGI_APPLICATION error
If you see an `ImproperlyConfigured: Cannot import ASGI_APPLICATION module 'pairdraft.asgi'` error, it usually means there is an incorrect import somewhere in the code.


#### If you see a CORS issue using VSCode debugger, it's because it doesn't allow you to set cookies.


#### Inactive developer path
```
xcrun: error: invalid active developer path (/Library/Developer/CommandLineTools), missing xcrun at: /Library/Developer/CommandLineTools/usr/bin/xcrun
```
Run `xcode-select --install` to fix this.

#### django.db.utils.ProgrammingError: cannot cast type bigint to uuid
See section on converting an id field to a uuid field

#### if `./manage.py runserver` seems like it's working but you can't open up the site in the browser, it might be due to a missing import, maybe from a third party package like Langchain.  Look at commit 52bd52c4012d78d29852578cd112b5fdedb727c9 for an example of how this issue was resolved.