FROM php:8.1-apache

RUN apt-get update \
    && apt-get install -y git emacs \
    && docker-php-ext-install pdo_mysql \
    && less vim curl zip
RUN apt-get install -y unzip

COPY ./apache/apache2.conf /etc/apache2/apache2.conf
COPY ./apache/000-default.conf /etc/apache2/sites-available/000-default.conf

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

RUN a2enmod rewrite

WORKDIR /var/www/html/src


