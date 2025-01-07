# pull official base image
FROM python:3.12-slim

# set work directory
WORKDIR /usr/src/backend

# set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# install netcat
RUN apt-get update && \
    apt-get -y install netcat-traditional && \
    apt-get clean

# install pipenv
RUN pip install pipenv

# install dependencies
COPY Pipfile Pipfile.lock ${WORKDIR}
RUN pipenv install --system --deploy

# copy entrypoint.sh
COPY ./entrypoint.sh .
RUN sed -i 's/\r$//g' /usr/src/backend/entrypoint.sh
RUN chmod +x /usr/src/backend/entrypoint.sh

# copy project
COPY . .

# run entrypoint.sh
ENTRYPOINT ["/usr/src/backend/entrypoint.sh"]