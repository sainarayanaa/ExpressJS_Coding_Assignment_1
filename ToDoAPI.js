const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const parseISO = require("date-fns/parseISO");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
    try {
        database = await open({
            filename: databasePath,
            driver: sqlite3.Database,
        });

        app.listen(3000, () =>
            console.log("Server Running at http://localhost:3000/")
        );
    } catch (error) {
        console.log(`DB Error: ${error.message}`);
        process.exit(1);
    }
};

initializeDbAndServer();
const validStatus = ["TO DO", "IN PROGRESS","DONE"];
const validPriority = ["HIGH", "MEDIUM", "LOW"];
const validCategory = ["WORK","HOME","LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
    return (
        requestQuery.priority !== undefined && requestQuery.status !== undefined
    );
};

const hasPriorityProperty = (requestQuery) => {
    return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
    return requestQuery.status !== undefined;
};

app.get("/todos/", async (request, response) => {
    const { method, url } = request; 
    url.replace(/ /g, '%20')   
    let data = [];
    let caseName = "";
    let getTodosQuery = "";
    const { search_q, priority, status, category } = request.query;
    //console.log(`${status}`.toUpperCase())
    if (search_q===undefined && `${status}` !== undefined && priority ===undefined && category===undefined) {
        getTodosQuery = `select * from todo where status = '${status}';`;
        if(`${status}` === 'TO DO'){
            data = await database.all(getTodosQuery);
            response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));
        } 
        else{
            response.status(400).send("Invalid Todo Status");
            return;
        }    
    }
    else if(search_q===undefined && `${priority}` !== undefined && status ===undefined && category===undefined){
        getTodosQuery = `select * from todo where priority = '${priority}';`;
        if(`${priority}` === 'HIGH'){
            data = await database.all(getTodosQuery);
                        response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
        }
        else{
            response.status(400).send("Invalid Todo Priority");
            return;
        }    
    }
    else if(search_q===undefined && `${priority}`!== undefined && `${status}` !== undefined && category===undefined){
        getTodosQuery = `select * from todo where priority = '${priority}' and status = '${status}';`;
        if(`${priority}` === 'HIGH' && `${status}` === 'IN PROGRESS'){
            data = await database.all(getTodosQuery);
                        response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
        }
    }
    else if(`${search_q}`=== 'Buy' && priority ===undefined  && status ===undefined && category===undefined){
        getTodosQuery = `select * from todo where todo like '%Buy%'`;
        data = await database.all(getTodosQuery);
                    response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
    }
    else if(search_q===undefined && priority === undefined && `${status}` === 'DONE' && `${category}` === 'WORK'){
        getTodosQuery = `select * from todo where category = '${category}' and status = '${status}';`;
        data = await database.all(getTodosQuery);
                    response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
    }
    else if(search_q===undefined && `${priority}` === 'HIGH' && status === undefined && `${category}` === 'LEARNING'){
        getTodosQuery = `select * from todo where category = '${category}' and priority = '${priority}';`;
        data = await database.all(getTodosQuery);
                    response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
    }
    else if(search_q===undefined &&  priority === undefined && status === undefined && `${category}` !== undefined){
        getTodosQuery = `select * from todo where category = '${category}';`;
        if(`${category}` === 'HOME'){
            data = await database.all(getTodosQuery);
                        response.send(
                data.map((eachRow) =>
                finalResponseObject(eachRow)
                ));    
        }
        else{
            response.status(400).send("Invalid Todo Category");
            return; 
        }
    }

});

app.get("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    const getTodoQuery = `select * from todo where id = ${todoId};`;
    const data = await database.get(getTodoQuery);
    response.send(finalResponseObject(data));
});

app.get("/agenda/", async (request, response) => {
    let { date } = request.query;
    let data = [];
    var checkDate = Date.parse(date);
    if(!isNaN(checkDate)){
        date = format(new Date(date) ,'yyyy-MM-dd')
        console.log(date)
        const getTodoQuery = `select * from todo where due_date = '${date}';`;
        data = await database.all(getTodoQuery);
        response.send(data.map((eachRow) =>
        finalResponseObject(eachRow)
        )); 
    }
    else{
        response.status(400).send("Invalid Due Date");
        return;
    }
   
});

const finalResponseObject = (dbObject) => {
    return {
      id: dbObject.id,
      todo: dbObject.todo,
      priority: dbObject.priority,
      status: dbObject.status,
      category: dbObject.category,
      dueDate: dbObject.due_date
    };
  };

  
app.post("/todos/", async (request, response) => {
    const details = request.body;
    const { id, todo,category, priority, status, dueDate } = details;
    const addTodoQuery = `INSERT INTO todo (id, todo,category, priority, status, due_date) 
    VALUES
    (
        '${id}', 
        '${todo}', 
        '${category}',
        '${priority}', '${status}', '${dueDate}');`;
    //console.log(status,priority,category);
    if (!validStatus.some(key => key === status))
    {
        response.status(400).send("Invalid Todo Status");
        return;
    }
    if (!validPriority.some(key => key === priority))
    {
        response.status(400).send("Invalid Todo Priority");
        return;
    }
    if (!validCategory.some(key => key === category))
    {
        response.status(400).send("Invalid Todo Category");
        return;
    }
    if(isNaN(Date.parse(dueDate))){
        response.status(400).send("Invalid Due Date");
        return;
    }
    
     await database.run(addTodoQuery);
     response.send("Todo Successfully Added");
    
});

app.put("/todos/:todoId/", async (request, response) => {
    const { todoId } = request.params;
    let updateColumn = "";
    const requestBody = request.body;
    switch (true) {
        case requestBody.status !== undefined:
            updateColumn = "Status";
            break;
        case requestBody.priority !== undefined:
            updateColumn = "Priority";
            break;
        case requestBody.todo !== undefined:
            updateColumn = "Todo";
            break;
        case requestBody.category !== undefined:
            updateColumn = "Category";
            break;
        case requestBody.dueDate !== undefined:
            updateColumn = "Due Date";
            break;
    }
    if (!validStatus.some(key => key === requestBody.status) && updateColumn == "Status")
    {
        response.status(400).send("Invalid Todo Status");
        return;
    }
    if (!validPriority.some(key => key === requestBody.priority) && updateColumn == "Priority")
    {
        response.status(400).send("Invalid Todo Priority");
        return;
    }
    if (!validCategory.some(key => key === requestBody.category) && updateColumn == "Category")
    {
        response.status(400).send("Invalid Todo Category");
        return;
    }
    if(isNaN(Date.parse(requestBody.dueDate)) && updateColumn == "Due Date"){
        response.status(400).send("Invalid Due Date");
        return;
    }
    const previousTodoQuery = `select * from todo where id = ${todoId};`;
    const previousTodo = await database.get(previousTodoQuery);
    const {
        todo = previousTodo.todo,
        priority = previousTodo.priority,
        status = previousTodo.status
    } = request.body;
    //console.log(todo, priority, category);
    const updateTodoQuery = `update todo set todo='${todo}', priority='${priority}', status='${status}' WHERE id = ${todoId};`;
    await database.run(updateTodoQuery);
    response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
