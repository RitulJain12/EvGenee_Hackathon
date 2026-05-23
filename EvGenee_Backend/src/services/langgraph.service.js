const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const { ChatGroq } = require("@langchain/groq");
const { createReactAgent } = require("@langchain/langgraph/prebuilt");
const { MemorySaver } = require("@langchain/langgraph");
const { HumanMessage, SystemMessage, AIMessage } = require("@langchain/core/messages");
const Station = require("../models/station.model");
const Booking = require("../models/booking.model");
const MessageModel = require("../models/message.model");
const User = require("../models/user.model");
const { GROQ_API_KEY, PLATFORM_FEE_PERCENTAGE } = require('../config/config');
const axios = require("axios");
const memory = new MemorySaver();

let groqLlm = null;
const getGroqLlM = () => {
  if (!groqLlm) {
    groqLlm = new ChatGroq({
      model: "openai/gpt-oss-20b",
      temperature: 0.1,
      apiKey: GROQ_API_KEY,
    });
  }
  return groqLlm;
};

const geocodeCache = new Map();
const reverseGeocodeCache = new Map();
const roadDistanceCache = new Map();

async function geocodeLocation(locationStr) {
  try {
    const cacheKey = locationStr.trim().toLowerCase();
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey);
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationStr)}&format=json&limit=1`;
    const response = await axios.get(url, { headers: { "User-Agent": "EvGenee_Bot" } });
    if (response.data && response.data.length > 0) {
      const coords = [parseFloat(response.data[0].lon), parseFloat(response.data[0].lat)];
      geocodeCache.set(cacheKey, coords);
      return coords;
    }
    return null;
  } catch (err) {
    console.error("Geocoding error:", err.message);
    return null;
  }
}

async function reverseGeocodeLocation(coords) {
  try {
    const cacheKey = `${coords.lat},${coords.lng}`;
    if (reverseGeocodeCache.has(cacheKey)) {
      return reverseGeocodeCache.get(cacheKey);
    }

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`;
    const response = await axios.get(url, { headers: { "User-Agent": "EvGenee_Bot" } });
    if (response.data && response.data.display_name) {
      reverseGeocodeCache.set(cacheKey, response.data.display_name);
      return response.data.display_name;
    }
    return null;
  } catch (err) {
    console.error("Reverse geocoding error:", err.message);
    return null;
  }
}
async function getRoadDistance(startCoords, endCoords) {
  try {
    const cacheKey = `${startCoords[0]},${startCoords[1]}|${endCoords[0]},${endCoords[1]}`;
    if (roadDistanceCache.has(cacheKey)) {
      return roadDistanceCache.get(cacheKey);
    }

    const url = `http://router.project-osrm.org/route/v1/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?overview=false`;
    const response = await axios.get(url);
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const result = {
        distanceKm: (route.distance / 1000).toFixed(2),
        durationMins: (route.duration / 60).toFixed(1)
      };
      roadDistanceCache.set(cacheKey, result);
      return result;
    }
    return null;
  } catch (err) {
    console.error("OSRM error:", err.message);
    return null;
  }
}

const timeToMinutes = (time) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes) => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

async function checkAvailability(stationId, date, connectorType, startTime, endTime, maxPorts, bookings = null) {
  if (!bookings) {
    bookings = await Booking.find({
      station: stationId,
      date,
      connectorType,
      $or: [
        { status: { $in: ['confirmed', 'in-progress'] } },
        { status: 'pending', createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } }
      ],
    }).lean();
  }

  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);
  const events = [];

  for (const b of bookings) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    if (bStart < reqEnd && bEnd > reqStart) {
      events.push({ time: bStart, type: 1 });
      events.push({ time: bEnd, type: -1 });
    }
  }
  events.sort((a, b) => a.time - b.time || a.type);

  let currentConcurrent = 0;
  for (const b of bookings) {
    const bStart = timeToMinutes(b.startTime);
    const bEnd = timeToMinutes(b.endTime);
    if (reqStart >= bStart && reqStart < bEnd) {
      currentConcurrent++;
    }
  }

  if (currentConcurrent >= maxPorts) return { available: false, time: startTime };

  for (const event of events) {
    if (event.time >= reqEnd) break;
    if (event.time > reqStart) {
      currentConcurrent += event.type;
      if (currentConcurrent >= maxPorts) {
        return { available: false, time: minutesToTime(event.time) };
      }
    }
  }

  return { available: true };
}

async function findNextAvailableSlot(stationId, date, connectorType, startTime, durationMinutes, maxPorts, stationOpeningHours, bookings = null) {
  if (!bookings) {
    bookings = await Booking.find({
      station: stationId,
      date,
      connectorType,
      $or: [
        { status: { $in: ['confirmed', 'in-progress'] } },
        { status: 'pending', createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } }
      ],
    }).lean();
  }

  const bookingIntervals = bookings.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime)
  }));

  let currentStartMin = timeToMinutes(startTime);
  const searchLimitMin = currentStartMin + 480;
  let openMin = 0;
  let closeMin = 1439;
  if (stationOpeningHours) {
    const [ot, ct] = stationOpeningHours.split('-').map(t => t.trim());
    openMin = timeToMinutes(ot);
    closeMin = timeToMinutes(ct);
  }

  while (currentStartMin + durationMinutes <= Math.min(searchLimitMin, closeMin)) {
    currentStartMin += 15;
    const nextStart = currentStartMin;
    const nextEnd = currentStartMin + durationMinutes;

    let concurrent = 0;
    for (const interval of bookingIntervals) {
      if (interval.start < nextEnd && interval.end > nextStart) {
        concurrent++;
        if (concurrent >= maxPorts) break;
      }
    }

    if (concurrent < maxPorts) {
      return minutesToTime(nextStart);
    }
  }

  return null;
}

const isOverlapping = (startA, endA, startB, endB) => {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && sB < eA;
};

const createFindBestStationTool = (userInfo, userLocation) => tool(
  async ({ location, date, startTime, endTime, chargerType }) => {
    try {
      let coords = null;
      let locationName = location || "";

      // Check if location was provided and check if it's coordinates or a string
      if (locationName && locationName.trim()) {
        const coordsRegex = /^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/;
        const match = locationName.trim().match(coordsRegex);
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[3]);
          coords = [lng, lat];
        } else {
          coords = await geocodeLocation(locationName);
        }
      }

      // Fallback 1: Use userLocation if provided from socket
      if (!coords && userLocation && typeof userLocation.lat === 'number' && typeof userLocation.lng === 'number') {
        coords = [userLocation.lng, userLocation.lat];
        const address = await reverseGeocodeLocation(userLocation).catch(() => null);
        locationName = address || "your current location";
      }

      // Fallback 2: Past bookings
      if (!coords && userInfo && userInfo.userId) {
        const lastBooking = await Booking.findOne({ user: userInfo.userId })
          .sort({ createdAt: -1 })
          .populate('station');
        if (lastBooking && lastBooking.station && lastBooking.station.location) {
          coords = lastBooking.station.location.coordinates;
          locationName = lastBooking.station.address?.city || lastBooking.station.name || "your last booking location";
        }
      }

      // Fallback 3: First available station
      if (!coords) {
        const anyStation = await Station.findOne();
        if (anyStation && anyStation.location) {
          coords = anyStation.location.coordinates;
          locationName = anyStation.address?.city || anyStation.name || "default location";
        }
      }

      // Fallback 4: Hardcoded Bhopal
      if (!coords) {
        coords = [77.4126, 23.2599]; // [longitude, latitude]
        locationName = "Bhopal";
      }

      const stationQuery = {
        location: {
          $near: {
            $geometry: { type: "Point", coordinates: coords },
            $maxDistance: 4000000
          }
        },
        typeOfConnectors: chargerType,
        isOpen: true
      };

      const stations = await Station.find(stationQuery).limit(5).lean();

      if (stations.length === 0) {
        return JSON.stringify({ error: `I couldn't find any open charging stations with ${chargerType} nearby ${locationName}.` });
      }

      const inputDate = typeof date === 'string' && date.trim().toLowerCase() === 'today' ? null : date;
      let queryDate = inputDate ? new Date(inputDate) : new Date();
      if (isNaN(queryDate.valueOf())) {
        queryDate = new Date();
      }
      queryDate.setHours(0, 0, 0, 0);

      const effectiveEndTime = endTime && endTime.trim()
        ? endTime
        : minutesToTime(timeToMinutes(startTime) + 60);

      const now = new Date();
      const indianTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
      const [datePart, timePart] = indianTimeStr.split(', ');
      const [currH, currM] = timePart.split(':').map(Number);
      const currentMinutes = currH * 60 + currM;

      const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      today.setHours(0, 0, 0, 0);

      if (queryDate < today) {
        return JSON.stringify({ error: "Cannot search for past dates." });
      }

      if (queryDate.getTime() === today.getTime()) {
        if (timeToMinutes(startTime) <= currentMinutes) {
          return JSON.stringify({ error: "The requested start time has already passed for today. Please provide a future time." });
        }
      }

      let exactMatchStation = null;
      let exactMatchRoadInfo = null;
      const stationBookings = new Map();
      const roadInfoCache = new Map();
      const requestedDuration = timeToMinutes(effectiveEndTime) - timeToMinutes(startTime);

      const getCachedRoadInfo = async (station) => {
        const key = station._id.toString();
        if (roadInfoCache.has(key)) {
          return roadInfoCache.get(key);
        }
        const info = await getRoadDistance(coords, station.location.coordinates);
        roadInfoCache.set(key, info);
        return info;
      };

      for (const st of stations) {
        const bookings = await Booking.find({
          station: st._id,
          date: queryDate,
          connectorType: chargerType,
          $or: [
            { status: { $in: ['confirmed', 'in-progress'] } },
            { status: 'pending', createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } }
          ],
        }).lean();
        stationBookings.set(st._id.toString(), bookings);

        const pricingConfig = st.pricing.find(p => p.connectorType === chargerType);
        const maxPorts = pricingConfig?.portCount || st.availablePorts;
        const availabilityResult = await checkAvailability(st._id, queryDate, chargerType, startTime, effectiveEndTime, maxPorts, bookings);

        if (availabilityResult.available) {
          exactMatchStation = st;
          exactMatchRoadInfo = await getCachedRoadInfo(st);
          break;
        }

        const nextSlot = await findNextAvailableSlot(st._id, queryDate, chargerType, startTime, requestedDuration, maxPorts, st.openingHours, bookings);
        if (nextSlot) {
          st.nextAvailableSlot = nextSlot;
        }
      }

      const stationsData = await Promise.all(stations.map(async (st) => {
        const roadInfo = await getCachedRoadInfo(st);
        return {
          id: st._id,
          name: st.name,
          city: st.address.city,
          isOpen: st.isOpen,
          totalPorts: st.totalPorts,
          availablePorts: st.availablePorts,
          chargerTypes: st.typeOfConnectors,
          chargingSpeed: st.chargingSpeed,
          pricing: st.pricing,
          isCompatible: true,
          nextAvailableSlot: st.nextAvailableSlot || null,
          roadDistance: roadInfo ? roadInfo.distanceKm : null,
          travelTime: roadInfo ? roadInfo.durationMins : null
        };
      }));

      if (exactMatchStation) {
        const distanceStr = exactMatchRoadInfo ? ` (approx. ${exactMatchRoadInfo.distanceKm} KM, ${exactMatchRoadInfo.durationMins} mins away by road)` : "";
        return JSON.stringify({
          text: `Found a great match! ${exactMatchStation.name}${distanceStr} in ${exactMatchStation.address.city} is AVAILABLE from ${startTime} to ${endTime}.\nWould you like me to book it for you?`,
          stations: stationsData,
          foundAvailable: true
        });
      }

      let altMatch = null;
      const reqStartMins = timeToMinutes(startTime);
      const duration = timeToMinutes(effectiveEndTime) - reqStartMins;

      for (const st of stations) {
        const bookings = stationBookings.get(st._id.toString()) || [];
        const pricingConfig = st.pricing.find(p => p.connectorType === chargerType);
        const maxPorts = pricingConfig?.portCount || st.availablePorts;

        for (let offset = 60; offset <= 240; offset += 60) {
          const altStartMins = reqStartMins + offset;
          const altEndMins = altStartMins + duration;

          if (altStartMins >= 24 * 60 || altEndMins >= 24 * 60) continue;

          const altStart = `${Math.floor(altStartMins / 60).toString().padStart(2, '0')}:${(altStartMins % 60).toString().padStart(2, '0')}`;
          const altEnd = `${Math.floor(altEndMins / 60).toString().padStart(2, '0')}:${(altEndMins % 60).toString().padStart(2, '0')}`;

          let altOverlapping = 0;
          for (const b of bookings) {
            if (isOverlapping(altStart, altEnd, b.startTime, b.endTime)) altOverlapping++;
          }

          if (altOverlapping < maxPorts) {
            const roadInfo = await getCachedRoadInfo(st);
            altMatch = { st, altStart, altEnd, roadInfo };
            break;
          }
        }
        if (altMatch) break;
      }

      if (altMatch) {
        const distanceStr = altMatch.roadInfo ? ` (approx. ${altMatch.roadInfo.distanceKm} KM, ${altMatch.roadInfo.durationMins} mins away)` : "";
        return JSON.stringify({
          text: `The requested time slot is fully booked at nearby stations. However, ${altMatch.st.name}${distanceStr} is AVAILABLE later from ${altMatch.altStart} to ${altMatch.altEnd}.\nWould you like to book this alternative slot instead?`,
          stations: stationsData,
          foundAvailable: true
        });
      }

      return JSON.stringify({
        error: `Sorry, all nearby stations are fully booked for ${chargerType} connectors around that time.`,
        stations: stationsData,
        foundAvailable: false
      });
    } catch (err) {
      console.error("Tool Error:", err);
      return JSON.stringify({ error: `Sorry, I encountered an error while searching for stations: ${err.message}` });
    }
  },
  {
    name: "find_best_station",
    description: "Searches for EV charging stations and rigorously checks port availability against active bookings.",
    schema: z.object({
      location: z.string().optional().describe("The city, area, or address to search near. If not provided, it will automatically search near your current location or past booking location."),
      date: z.string().optional().describe("The exact date for the booking (e.g., '2024-05-02'). If omitted, today is assumed."),
      startTime: z.string().describe("The start time in 24-hour HH:MM format (e.g., '10:00')"),
      endTime: z.string().optional().describe("The end time in 24-hour HH:MM format (e.g., '12:00'). If omitted, the booking defaults to 1 hour."),
      chargerType: z.string().describe("The type of EV connector, e.g., 'CCS2', 'Type2', 'CHAdeMO'"),
    })
  }
);

const createBookingTool = (userInfo) => tool(
  async ({ stationId, date, startTime, endTime, chargerType }) => {
    try {
      const station = await Station.findById(stationId);
      if (!station) return JSON.stringify({ error: "Station not found." });

      const requestedEndTime = endTime && endTime.trim() ? endTime : minutesToTime(timeToMinutes(startTime) + 60);

      let bookingDate = date ? new Date(date) : new Date();
      if (isNaN(bookingDate.valueOf())) {
        bookingDate = new Date(); 
      }
      bookingDate.setHours(0, 0, 0, 0);

      const now = new Date();
      const indianTimeStr = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
      const [datePart, timePart] = indianTimeStr.split(', ');
      const [currH, currM] = timePart.split(':').map(Number);
      const currentMinutes = currH * 60 + currM;

      const today = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      today.setHours(0, 0, 0, 0);

      if (bookingDate < today) {
        return JSON.stringify({ error: "Cannot book for a past date." });
      }

      if (bookingDate.getTime() === today.getTime()) {
        if (timeToMinutes(startTime) <= currentMinutes) {
          return JSON.stringify({ error: "Cannot book a time slot in the past for today." });
        }
      }

      const requestedStart = timeToMinutes(startTime);
      const requestedEnd = timeToMinutes(requestedEndTime);
      const durationMinutes = requestedEnd - requestedStart;

      if (requestedEnd >= 24 * 60) {
        return JSON.stringify({ error: "Booking duration cannot cross midnight. Please choose an earlier start time." });
      }

      if (durationMinutes < 60) {
        return JSON.stringify({ error: "Booking duration cannot be less than 1 hour." });
      }

      
      const existingBookings = await Booking.find({
        station: stationId,
        date: bookingDate,
        connectorType: chargerType,
        $or: [
          { status: { $in: ['confirmed', 'in-progress'] } },
          { status: 'pending', createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) } }
        ],
      });
      
      const pricingConfig = station.pricing.find(p => p.connectorType === chargerType);
      const maxPorts = pricingConfig?.portCount || station.availablePorts;

      const availabilityResult = await checkAvailability(stationId, bookingDate, connectorType, startTime, requestedEndTime, maxPorts);
      
      if (!availabilityResult.available) {
        return JSON.stringify({ error: "Conflict detected: This slot is no longer available. Please try another time." });
      }

      const pricing = station.pricing.find((p) => p.connectorType === chargerType);
      const pricePerKWh = pricing ? pricing.priceperKWh : 0;
      const durationHours = durationMinutes / 60;
      const estimatedKWh = parseFloat((station.chargingSpeed * durationHours).toFixed(2));
      const totalCost = parseFloat((estimatedKWh * pricePerKWh).toFixed(2));

      const platformFeePercentage = PLATFORM_FEE_PERCENTAGE;
      const platformFee = parseFloat(((totalCost * platformFeePercentage) / 100).toFixed(2));
      const grandTotal = parseFloat((totalCost + platformFee).toFixed(2));

      const booking = await Booking.create({
        user: userInfo.userId,
        station: stationId,
        connectorType: chargerType,
        date: bookingDate,
        startTime,
        endTime: requestedEndTime,
        durationMinutes,
        estimatedKWh,
        totalCost,
        platformFee,
        grandTotal,
        status: 'pending',
      });

      return JSON.stringify({
        success: true,
        bookingId: booking._id,
        message: "Booking is pending. User must pay advance within 10 minutes."
      });
    } catch (err) {
      console.error("Booking Tool Error:", err);
      return `Failed to create booking: ${err.message}`;
    }
  },
  {
    name: "create_booking",
    description: "Creates a formal booking in the system after the user confirms a specific slot and station.",
    schema: z.object({
      stationId: z.string().describe("The ID of the station to book"),
      date: z.string().optional().describe("The date of booking. If omitted, today is assumed."),
      startTime: z.string().describe("Start time HH:MM"),
      endTime: z.string().optional().describe("End time HH:MM. If omitted, defaults to 1 hour after start time."),
      chargerType: z.string().describe("The connector type"),
    })
  }
);

const getSystemPrompt = async (userId, location = null) => {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US');
  
  const user = await User.findById(userId, 'name savedVehicles vehicle vehicleNumbers').lean();
  let profileInfo = "";
  if (user) {
    profileInfo = `\nUser Profile Info:\n- Name: ${user.name}\n`;
    if (user.savedVehicles && user.savedVehicles.length > 0) {
      profileInfo += `- Saved Vehicles:\n${user.savedVehicles.map(v => `  * ${v.nickname}: ${v.type} with ${v.connectorType} connector (Number: ${v.vehicleNumber || 'N/A'})`).join('\n')}\n`;
    } else {
      profileInfo += `- Vehicle Type: ${user.vehicle?.type || 'Not specified'}\n- Preferred Connector: ${user.vehicle?.connectorType || 'Not specified'}\n- Saved Vehicle Numbers: ${user.vehicleNumbers?.join(', ') || 'None'}\n`;
    }
  }

  let locationInfo = "";
  if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
    const address = await reverseGeocodeLocation(location).catch(() => null);
    locationInfo = `\nUser Current Location:\n- Coordinates: ${location.lat}, ${location.lng}\n`;
    if (address) {
      locationInfo += `- Approximate address: ${address}\n`;
    }
    locationInfo += `Use this as the user's current location. Do not ask the user for location again unless they explicitly say they want to change it.\n`;
  }

  return new SystemMessage(`You are EvGenee, a helpful, polite, and efficient voice assistant for EV Charging Station bookings.
Ritul Jain my creator trained me on EvGenee platform. I must only respond to questions related EvGenee.
For any out-of-topic questions,say Ritul Jain my creator trained me on EvGenee Please ask question related to it,and dont repeat same for same questions give various ans if user try to ask again and again out of context tell him/her that sorry i will not able to help any thing beyound our app.

Current context:
${profileInfo}${locationInfo}
Guidelines for identifying the user's vehicle and connector:
1. **Prioritize Saved Vehicles**: If the user mentions booking a charger but hasn't specified which car, and they have saved vehicles in their profile, ask: "Are you booking for your [Vehicle Nickname]?" instead of asking for the charger type.
2. **Auto-fill Details**: Once the user confirms the vehicle (e.g., "Yes, for the Nexon"), automatically use that vehicle's connector type (e.g., CCS2) for all subsequent searches and bookings without asking again.
3. **Handle Ambiguity**: If they have multiple saved vehicles, list them and ask which one they are using today.
4. **Fallback**: If they have no saved vehicles, only then ask for the charger type.

Guidelines for dates, times, and locations:
1. **Auto-fill Location**: If the user asks to book a slot or search for stations and does not specify a location, do not ask them where they are. Instead, call the 'find_best_station' tool without specifying the location parameter (omit it), as the tool will automatically resolve the user's location based on their GPS coordinates, booking history, or nearby stations.
2. **Assume Current Date**: If the user does not specify a date for the slot booking, assume today's date.
3. **Assume Duration**: If the user specifies a start time but no end time or duration (e.g., "book at 10:00"), assume a 1-hour charging duration and calculate the endTime accordingly (e.g., "11:00").

When searching for stations:
1. Use the identified or confirmed connector type.
2. If they have a saved vehicle number for the selected car, use it automatically for the booking.
3. **Always check availability and mention exact units**: If the user asks about a station or slot, mention how many units are free (e.g., "There are 3 CCS2 units available"). If the current slot is full, mention that all units are occupied and suggest the next one.
4. Suggest the best station based on road distance and travel time.

Important:
- Only book if the user confirms the details.
- Always be polite and professional.
- Do not use markdown (asterisks, etc.) in your final response.
- When 'create_booking' is successful, tell the user their booking is reserved (pending) and they MUST go to My Bookings and pay the advance within 10 minutes to confirm it, or it will be auto-cancelled.
- Be concise and friendly.
- Do not provide long answers.`);
};

function createVoiceAgent(userInfo, systemPrompt, userLocation = null) {
  const tools = [
    createFindBestStationTool(userInfo, userLocation),
    createBookingTool(userInfo)
  ];

  const agent = createReactAgent({
    llm: getGroqLlM(),
    tools,
    checkpointSaver: memory,
    messageModifier: systemPrompt,
  });

  return agent;
}

async function processVoiceChat(message, threadId, userInfo, location = null) {
  try {
    const history = await MessageModel.find({ threadId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    const systemMessage = await getSystemPrompt(userInfo.userId, location);
    const formattedHistory = history.reverse().map(msg => {
      if (msg.role === 'user') return new HumanMessage(msg.content);
      return new AIMessage(msg.content);
    });

    await MessageModel.create({
      threadId,
      user: userInfo.userId,
      role: 'user',
      content: message
    });

    const voiceAgent = createVoiceAgent(userInfo, systemMessage, location);
    const messagesToInvoke = [...formattedHistory, new HumanMessage(message)];
    
    const response = await voiceAgent.invoke(
      { messages: messagesToInvoke },
      { configurable: { thread_id: threadId } }
    );

    const aiMessages = response.messages.filter(m => m._getType() === "ai");
    const lastMessage = aiMessages[aiMessages.length - 1];

    if (lastMessage && lastMessage.content) {
      await MessageModel.create({
        threadId,
        user: userInfo.userId,
        role: 'ai',
        content: lastMessage.content
      });
    }

    
    let bookingId = null;
    const toolMessages = response.messages.filter(m => m._getType() === "tool");
    for (const tm of toolMessages) {
      if (tm.content && (tm.content.startsWith('{') || tm.content.startsWith('['))) {
        try {
          const content = JSON.parse(tm.content);
          if (content.success && content.bookingId) {
            bookingId = content.bookingId;
          }
        } catch (e) {
           console.log(`Error in toolmessages ${e.message}`);
        }
      }
    }

    if (bookingId) {
      return {
        response: lastMessage.content,
        bookingId: bookingId,
        redirect: true
      };
    }

   
    let stations = null;
    for (const tm of toolMessages) {
      if (tm.content && (tm.content.startsWith('{') || tm.content.startsWith('['))) {
        try {
          const content = JSON.parse(tm.content);
          if (content.stations) {
            stations = content.stations;
          }
        } catch (e) {}
      }
    }

    if (stations) {
      return {
        response: lastMessage.content,
        stations: stations
      };
    }

    return lastMessage.content;
  } catch (error) {
    console.error("LangGraph Agent Error:", error);
    throw new Error("Failed to process message through LangGraph agent");
  }
}

module.exports = {
  processVoiceChat,
};
