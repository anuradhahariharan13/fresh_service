function getValidType(typeName) {
  const allowed = [
    "incident",
    "problem",
    "request",
    "question",
    "service task",
    "general question",
    "account related",
    "printer repair/triage",
    "opinyin survey",
    "puma ops - remittance form"
  ];

  const fallbackMap = {
    hardware: "incident",
    software: "problem",
    network: "incident",
    email: "request"
  };

  if (!typeName) return "incident";

  const normalized = typeName.trim().toLowerCase();
  const directMatch = allowed.find((t) => t.toLowerCase() === normalized);
  return directMatch || fallbackMap[normalized] || "incident";
}

function getValidPriority(priority) {
  return [1, 2, 3, 4].includes(priority) ? priority : 1;
}

function getValidStatus(status) {
  return [2, 3, 4, 5, 10, 11].includes(status) ? status : 2;
}

exports = {
  onTicketUpdateCallback: async function (args) {
    const data = args.data;
    console.log("Payload received on update:", data);

    if (!data || !data.ticket) {
      console.error("Ticket data missing in args.data");
      return;
    }

    const ticket = data.ticket;

     const alreadySynced = !!ticket.custom_fields?.freshdesk_ticket_id;
    if (alreadySynced) {
      console.log("Freshdesk ticket already exists. Skipping sync.");
      return;
    }

   const syncField = (ticket.changes.custom_fields || []).find(f => f.name === 'freshdesk_sync');
   console.log(ticket.changes);
   console.log(syncField);
   const syncValue = Array.isArray(syncField?.value) && syncField.value[1]==='true';


    console.log("freshdesk_sync value:", syncValue);
  

    if (syncValue !== true) {
      console.log("Sync_to_Freshdesk is false or not set. Skipping Freshdesk ticket creation.");
      return;
    }

    const ticketPayload = {
      subject: ticket.subject || "No subject provided",
      description: ticket.description_text || "No description provided",
      email: data.requester?.email || "support@example.com",
      priority: getValidPriority(ticket.priority),
      status: getValidStatus(ticket.status),
      type: getValidType(ticket.category)
    };

 let freshdeskTicketId;
 let freshdeskTicketDescription;

    try {
      const response = await $request.invokeTemplate("createFreshdeskTicket", {
        iparam: {
          freshdesk_api_key:  args.iparams.freshdesk_api_key
        },
        body: JSON.stringify(ticketPayload)
      });

      const responseData = JSON.parse(response.response);
       freshdeskTicketId = responseData.id;
       freshdeskTicketDescription = responseData.description;
      console.log("Freshdesk ticket created successfully. ID:", responseData.id);
    } catch (error) {
      console.error("Error creating Freshdesk ticket:", error);
    }

const updatePayload = {
  "description":freshdeskTicketDescription,
  "custom_fields": {
    "freshdesk_ticket_id": freshdeskTicketId
  }
};

try {
  const response = await $request.invokeTemplate("updateFsTicketCustomField", { 
    iparam: {
      freshservice_api_key:  args.iparams.freshservice_api_key,
    },
    body: JSON.stringify(updatePayload)
  });

  const responseData = JSON.parse(response.response);
  console.log("Freshservice custom field updated successfully:", responseData);

} catch (error) { 
  console.error("Error updating Freshservice custom field:", error);
}

  }
};
