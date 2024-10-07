const x = {
    name: "",
    room: "",
    type: ""
}

const etyka = {
    name: "Etyka Zawodowa",
    room: "317 S",
    type: "w"
}

const metrologia = {
    name: "Metrologia",
    room: "316 S",
    type: "w"
}

const mat2 = {
    name: "Matematyka 2",
    room: "316 S",
    type: "w"
}

const mat1 = {
    name: "Matematyka 1",
    room: "314 S",
    type: "w"
}

const wf = {
    name: "WF",
    room: "",
    type: "c"
}

const j_obcy = {
    name: "Niemiecki",
    room: "131 K",
    type: "c"
}

const studiowanie = {
    name: "Studiowanie",
    room: "313 S",
    type: "w"
}

const informatyka = {
    name: "Informatyka",
    room: "316 S",
    type: "w"
}

const dyskretna = {
    name: "Matma Dyskretna",
    room: "317 S",
    type: "w"
}

const grafika = {
    name: "Grafika",
    room: "313 S",
    type: "w"
}

const board = [
    [ { name: "8:00 - 9:35" }, metrologia, x, mat2, mat1, x ],
    [ { name: "9:50 - 11:25" }, wf, x, x, studiowanie, informatyka ],
    [ { name: "11:40 - 13:15" }, x, x, x, x, dyskretna ],
    [ { name: "13:30 - 15:05" }, x, x, etyka, x, mat1 ],
    [ { name: "15:45 - 17:20" }, x, x, x, x, grafika ],
    [ { name: "17:35 - 19:10" }, x, x, j_obcy, x, x ],
]

let color_switch = 1;

function color(item){
    return item.type == "w" ? "color: #00ffff" : "color: #00ff00"
}

const table = document.querySelector("table")
board.forEach((items) => {
    color_switch = !color_switch

    table.insertAdjacentHTML('beforeEnd', `
        <tr class="tr tr${color_switch + 1}">
            <td class="time time${ color_switch + 1 }">${ items[0]?.name }</td>
            <td class="name" style="${ color(items[1]) }">${ items[1]?.name }<div class="place">${ items[1]?.room }</div></td>
            <td class="name row2" style="${ color(items[2]) }">${ items[2]?.name }<div class="place">${ items[2]?.room }</div></td>
            <td class="name row3" style="${ color(items[3]) }">${ items[3]?.name }<div class="place">${ items[3]?.room }</div></td>
            <td class="name row4" style="${ color(items[4]) }">${ items[4]?.name }<div class="place">${ items[4]?.room }</div></td>
            <td class="name row5" style="${ color(items[5]) }">${ items[5]?.name }<div class="place">${ items[5]?.room }</div></td>
        </tr>
    `)
})