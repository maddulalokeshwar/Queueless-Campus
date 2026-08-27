# Queueless Campus

## Smart Campus Queue Management System

Queueless Campus is a smart digital queue management system designed to reduce waiting time and improve service management in colleges and universities.

The system allows students to obtain queue tokens digitally instead of standing in physical queues. Students can either take a token immediately or pre-book a token for a future time. Staff members can manage and serve tokens through a dedicated dashboard, while administrators can create, update, and delete service counters.

The system also provides real-time queue updates and smart alerts using Socket.IO, allowing students and staff to receive updates without manually refreshing the page.

---

# 1. Project Objective / Problem Statement

## Problem Statement

Students in colleges frequently need to visit different administrative and service counters for tasks such as:

- Admissions
- Examination services
- Fee payment
- Certificates
- Student records
- Academic services
- General enquiries

Traditional queue systems require students to physically stand in line and wait until their turn arrives.

This creates several problems:

1. Long waiting times.
2. Physical crowding near service counters.
3. Difficulty estimating the expected waiting time.
4. Students may miss their turn if they leave the queue.
5. Staff members have limited visibility of the complete queue.
6. No convenient mechanism for scheduling a visit in advance.
7. Students often need to repeatedly check whether their token has been called.
8. Manual queue management can result in inefficient service handling.

Therefore, a digital queue management system is required to make campus services faster, more organized, and more convenient.

## Project Objective

The main objective of Queueless Campus is to provide a centralized digital platform that allows students to manage their campus service queues without physically waiting in line.

The system aims to:

- Digitize the campus token system.
- Reduce physical queues and crowding.
- Allow students to take tokens remotely.
- Allow students to pre-book service tokens.
- Provide estimated waiting information.
- Notify students when their pre-booked token becomes active.
- Provide real-time queue updates.
- Allow staff to efficiently serve tokens.
- Allow administrators to manage service counters.
- Improve overall campus service efficiency.

---

# 2. Proposed Solution

Queueless Campus provides a web-based queue management platform with three major user roles:

## Student

Students can:

- Register and log in.
- View available service counters.
- Take a token immediately.
- Pre-book a token for a future time.
- View their current token status.
- Monitor queue progress.
- Receive smart queue notifications.
- Log out securely.

## Staff

Staff members can:

- View the current queue.
- View waiting tokens.
- Call the next token.
- Serve the current token.
- Complete tokens.
- Monitor queue status.
- Receive real-time updates when new or pre-booked tokens become active.
- Log out securely.

## Administrator

Administrators can:

- View all service counters.
- Create new counters.
- Edit counter information.
- Delete counters.
- Configure services provided by counters.
- Manage the overall queue infrastructure.

The system uses a backend API connected to MongoDB and a React frontend. Socket.IO provides real-time communication between the server and connected clients.

---

# 3. Key Features

## 3.1 Digital Token Generation

Students can generate a queue token digitally instead of physically standing at a counter.

Each token contains information such as:

- Token number
- Student/user
- Counter
- Status
- Creation time

Token statuses include:

- `waiting`
- `serving`
- `completed`

---

## 3.2 Take Token Now

Students can choose to join a queue immediately.

The system:

1. Identifies the selected service/counter.
2. Generates the next available token number.
3. Adds the token to the waiting queue.
4. Updates the queue information.
5. Sends real-time updates to connected clients.

This allows students to join the queue remotely.

---

## 3.3 Pre-Booking

One of the major features of Queueless Campus is pre-booking.

Students can select a future time and reserve a token.

A pre-booked token contains:

```text
isPreBooked: true
bookedForTime: selected date and time