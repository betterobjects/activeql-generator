import { ActiveQLServer, DomainDefinition, Runtime } from 'activeql-server';
import express from 'express';
import path from 'path';

import { domainConfiguration } from './domain-configuration';
import { addJwtLogin, useJwtLogin } from './impl/jwt-login';

// some default values
const UPLOAD_DIR = '/uploads';
const STATIC_PATH = '/files';
const GRAPHQL_URL = '/graphql';
const DOMAIN_CONFIGURATION_FOLDER = __dirname + '/domain-configuration';

// load domain configuration from yaml files in folder ./domain-configuration
const domainDefinition:DomainDefinition = new DomainDefinition( DOMAIN_CONFIGURATION_FOLDER );

// add configuration from ./domain-configuration.ts
domainDefinition.add( domainConfiguration );

// add JWT login to domain configuration
addJwtLogin( domainDefinition );

export const activeqlServer = async( app: any ) => {
  // add JWT login middleware
  useJwtLogin( app );
  
  // serve uploaded files staticalles unter /files
  app.use( STATIC_PATH, express.static( path.join(__dirname, UPLOAD_DIR ) ) );
  
  const server = await ActiveQLServer.create( { domainDefinition } );
  server.applyMiddleware({ app, path: GRAPHQL_URL });
}

export const activeqlSeeed = async (truncate:boolean) => {
  const runtime = await Runtime.create( { domainDefinition } );
  return runtime.seed( truncate );
}
