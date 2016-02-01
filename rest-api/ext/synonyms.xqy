xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/synonyms";

declare namespace rapi = "http://marklogic.com/rest-api";
declare namespace roxy = "http://marklogic.com/roxy";

(:
 : To add parameters to the functions, specify them in the params annotations.
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") ext:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :)

(: This EXT only exists because I'm tired and I can't get sparql update to work with the REST endpoint ... :)

declare
  %roxy:params("term=xs:string", "synonym=xs:string")
  %rapi:transaction-mode("update")
function ext:post(
  $context as map:map,
  $params as map:map,
  $input as document-node()*
) as document-node()*
{
  let $term := fn:lower-case(map:get($params, "term"))
  let $synonym := fn:lower-case(map:get($params, "synonym"))
  return
    if (fn:not($term and $synonym))
    then
      fn:error((),"RESTAPI-SRVEXERR",
        (400, "Bad Request",  "Missing required parameters"))
    else (
      xdmp:set-response-code(200, "OK"),
      sem:sparql-update("
        INSERT DATA {
          GRAPH <synonyms> {
            $term <synonym> $synonym
          }
        }",
        map:new((
          map:entry("term", sem:iri(fn:lower-case($term))),
          map:entry("synonym", sem:iri(fn:lower-case($synonym)))
        ))
      )
    )
};

declare
  %roxy:params("term=xs:string", "synonym=xs:string")
function ext:delete($context as map:map, $params as map:map) as document-node()?
{
  let $term := map:get($params, "term")
  let $synonym := map:get($params, "synonym")
  return
    if (fn:not($term and $synonym))
    then
      fn:error((),"RESTAPI-SRVEXERR",
        (400, "Bad Request",  "Missing required parameters"))
    else (
      xdmp:set-response-code(200, "OK"),
      sem:sparql-update("
        DELETE DATA {
          GRAPH <synonyms> {
            $term <synonym> $synonym
          }
        }",
        map:new((
          map:entry("term", sem:iri($term)),
          map:entry("synonym", sem:iri($synonym))
        ))
      )
    )
};
