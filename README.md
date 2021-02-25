# ActiveQL

Domain driven GraphQL APIs with convention over configuration and DRY in mind. From domain model to full fledged GraphQL API and Admin UI in minutes.


## Installation

To start with ActiveQL you do not need install this package but can run the generator directly from the repository like so: 

```
npx betterobjects/activeql-generator
```

You can also fork an clone the ActiveQL Starter App from this repository: [https://github.com/betterobjects/activeql-starter](https://github.com/betterobjects/activeql-starter).


## Install dependencies 

```
cd express
npm i 
```

If you opted to add the ActiveQL Admin UI

```
cd angular
npm i 
```

<br>

## Run application

**Start the GraphQL API Express Server and Admin UI**

```
cd express
npm run start
```

**Start only the GraphQL API Express Server**

```
cd express
npm run server
```

**Start only the Admin UI**

```
cd angular
ng serve
```

## Quickstart 

You can add the configuration of an entity in a YAML file in the folder `./express/domain-configuration`. 

E.g. `car.yml`

```yaml
enum: 
	CarBrand: 
		- Mercedes
		- BMW
		- VW
		- Audi
		- Porsche

entity: 
	Car: 
		attributes: 
			brand: CarBrand!
			model: String!
			color: String
			mileage: Int
			registration: Date
```

After starting the GraphQL API Express Server point your browser to [http://localhost:4000/graphql](http://localhost:4000/graphql) and you should see a running fully fledged GraphQL API with 

* schema types
* type, types and statistics queries 
* create, updated and delete mutations
* validation
* filter
* sorting
* paging
* role based permissions handling
* seed and test data generation

and many more. 

If you installed and started the Admin UI you will find an Admin application for managing _cars_ (and any other entities you added) at [http://localhost:4000](http://localhost:4000)

## Developing

To learn how to translate your domain design to a GraphQL API and Admin UI you can consult the [Documentation ](https://betterobjects.github.io/activeql/) or go through an introductory [Tutorial](https://betterobjects.github.io/activeql/tutorial.html).